package gameacct

import "testing"

// Khoa game phai vua cot `tcg.account.password` (varchar(32)).
//
// Ban dau sinh 32 byte -> 43 ky tu base64url, va login server THAT tu choi dang ky voi
// "Data truncation: Data too long for column 'password'". Ban gia lap khong co rang buoc
// do dai nen loi chi lo ra khi chay voi JAR that.
func TestNewSecretFitsAccountPasswordColumn(t *testing.T) {
	seen := map[string]bool{}
	for range 200 {
		s, err := newSecret()
		if err != nil {
			t.Fatalf("sinh khoa: %v", err)
		}
		if len(s) > secretMaxLen {
			t.Fatalf("khoa dai %d ky tu, cot chi chua %d: %q", len(s), secretMaxLen, s)
		}
		if seen[s] {
			t.Fatalf("khoa trung: %q", s)
		}
		seen[s] = true
	}
}
