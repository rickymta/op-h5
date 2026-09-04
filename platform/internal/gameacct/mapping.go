package gameacct

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
)

// Vault ma hoa khoa rieng cua tung nguoi choi truoc khi luu xuong DB.
//
// Khoa nay thay cho mat khau that cua nguoi choi khi noi chuyen voi login server.
// No nam trong DB nen phai duoc ma hoa: lo mot ban dump DB khong duoc dong nghia voi
// viec dang nhap duoc vao moi tai khoan game.
type Vault struct{ aead cipher.AEAD }

// NewVault nhan khoa 32 byte dang base64 (ADAPTER_SECRET_ENC_KEY).
func NewVault(b64Key string) (*Vault, error) {
	key, err := base64.StdEncoding.DecodeString(b64Key)
	if err != nil {
		return nil, fmt.Errorf("ADAPTER_SECRET_ENC_KEY khong phai base64: %w", err)
	}
	if len(key) != 32 {
		return nil, fmt.Errorf("ADAPTER_SECRET_ENC_KEY dai %d byte, phai dung 32", len(key))
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return &Vault{aead: aead}, nil
}

// Seal ma hoa; nonce di kem o dau ban ma.
func (v *Vault) Seal(plain string) ([]byte, error) {
	nonce := make([]byte, v.aead.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}
	return v.aead.Seal(nonce, nonce, []byte(plain), nil), nil
}

// Open giai ma.
func (v *Vault) Open(sealed []byte) (string, error) {
	n := v.aead.NonceSize()
	if len(sealed) < n {
		return "", errors.New("ban ma qua ngan")
	}
	plain, err := v.aead.Open(nil, sealed[:n], sealed[n:], nil)
	if err != nil {
		return "", fmt.Errorf("giai ma khoa game: %w", err)
	}
	return string(plain), nil
}

// Identity la anh xa giua mot nguoi dung ID va tai khoan cua ho trong mot game.
type Identity struct {
	UserID       int64
	GameCode     string
	GameUsername string
	AccountUID   sql.NullString
}

// Mapper cap phat va tra cuu anh xa.
type Mapper struct {
	DB     *sql.DB
	Vault  *Vault
	Login  *LoginClient
	Game   string // game_code, vd "haitac"
	GameID string // gameId ma client gui, vd "10091"
	// PlatformCode danh dau tai khoan den tu he thong ID chu khong phai luong cu.
	PlatformCode string
	ChannelCode  string
}

// usernameFor sinh username trong game tu id nguoi dung.
//
// Suy ra tu id chu khong lay username cua nguoi choi: hai he thong co quy tac dat ten
// khac nhau, va nguoi choi doi ten o he thong ID khong duoc lam mat nhan vat trong game.
func usernameFor(userID int64) string { return fmt.Sprintf("id%09d", userID) }

// newSecret sinh khoa ngau nhien 32 byte dang base64url (43 ky tu).
func newSecret() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// Ensure dam bao nguoi dung co tai khoan trong game, tao neu chua co, roi tra ve
// anh xa kem khoa da giai ma.
func (m *Mapper) Ensure(ctx context.Context, userID int64) (*Identity, string, error) {
	var (
		id     Identity
		sealed []byte
	)
	err := m.DB.QueryRowContext(ctx, `
		SELECT user_id, game_code, game_username, game_secret, account_uid
		  FROM game_identities WHERE user_id = ? AND game_code = ?`, userID, m.Game).
		Scan(&id.UserID, &id.GameCode, &id.GameUsername, &sealed, &id.AccountUID)

	switch {
	case err == nil:
		secret, err := m.Vault.Open(sealed)
		if err != nil {
			return nil, "", err
		}
		return &id, secret, nil
	case !errors.Is(err, sql.ErrNoRows):
		return nil, "", err
	}

	// Chua co anh xa: sinh khoa, dang ky ben login server, roi ghi lai.
	username := usernameFor(userID)
	secret, err := newSecret()
	if err != nil {
		return nil, "", err
	}
	exists, err := m.Login.Exist(ctx, username)
	if err != nil {
		return nil, "", fmt.Errorf("kiem tra tai khoan game: %w", err)
	}
	if !exists {
		if err := m.Login.Register(ctx, RegisterInput{
			Username: username, Password: secret, Nickname: username,
			PlatformCode: m.PlatformCode, ChannelCode: m.ChannelCode,
		}); err != nil {
			return nil, "", fmt.Errorf("dang ky tai khoan game: %w", err)
		}
	}
	// Truong hop username da ton tai ma ta chua co anh xa la bat thuong (con sot tu
	// lan chay truoc, hoac trung ten). Bao loi thay vi doan, de khong cuop tai khoan.
	if exists {
		return nil, "", fmt.Errorf("tai khoan game %q da ton tai nhung khong co anh xa — can kiem tra thu cong", username)
	}

	sealedNew, err := m.Vault.Seal(secret)
	if err != nil {
		return nil, "", err
	}
	if _, err := m.DB.ExecContext(ctx, `
		INSERT INTO game_identities (user_id, game_code, game_username, game_secret)
		VALUES (?,?,?,?)`, userID, m.Game, username, sealedNew); err != nil {
		return nil, "", err
	}
	return &Identity{UserID: userID, GameCode: m.Game, GameUsername: username}, secret, nil
}

// Session dang nhap vao login server bang khoa cua Adapter va tra ve token cho client.
func (m *Mapper) Session(ctx context.Context, userID int64, clientType int) (*AccountSession, error) {
	id, secret, err := m.Ensure(ctx, userID)
	if err != nil {
		return nil, err
	}
	sess, err := m.Login.Login(ctx, LoginInput{
		Username: id.GameUsername, Password: secret,
		OpenID: fmt.Sprint(userID), GameID: m.GameID, ClientType: clientType,
		PlatformCode: m.PlatformCode, ChannelCode: m.ChannelCode,
	})
	if err != nil {
		return nil, fmt.Errorf("dang nhap login server: %w", err)
	}
	// Ghi lai uid that cua tcg.account sau lan dang nhap dau, de doi soat ve sau.
	if sess.Account.UID != "" && !id.AccountUID.Valid {
		_, _ = m.DB.ExecContext(ctx,
			`UPDATE game_identities SET account_uid = ? WHERE user_id = ? AND game_code = ?`,
			sess.Account.UID, userID, m.Game)
	}
	return sess, nil
}
