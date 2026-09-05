package main

import (
	"bytes"
	"html/template"
	"testing"

	"github.com/rickymta/op-h5/platform/internal/wallet"
)

// Cac trang moi (goi, don mua) phai parse va render duoc: loi template chi lo luc ExecuteTemplate.
func TestCatalogTemplatesRender(t *testing.T) {
	tpl, err := template.New("").Funcs(tplFuncs()).ParseFS(templatesFS, "templates/*.html")
	if err != nil {
		t.Fatalf("parse templates: %v", err)
	}
	a := &admin{ID: 1, Username: "quantri", Role: "owner"}
	games := []gameOpt{{Code: "haitac", Name: "Đại Hải Trình"}}

	var buf bytes.Buffer
	if err := tpl.ExecuteTemplate(&buf, "packages.html", map[string]any{
		"Admin": a, "Games": games, "Game": "haitac", "Category": "diamond", "Status": "", "Q": "",
		"Rows": []pkgRow{{ID: "18001", Name: "10.000 Nguyên Bảo", Category: "diamond", GrantMode: "pay",
			Status: "active", PriceXu: 10000, ItemTid: 18001}},
		"Cats": []catCount{{Category: "diamond", Active: 8, Total: 8}}, "Categories": catalogCategories,
	}); err != nil {
		t.Fatalf("render packages.html: %v", err)
	}
	if !bytes.Contains(buf.Bytes(), []byte("18001")) {
		t.Errorf("packages.html khong hien goi")
	}

	buf.Reset()
	if err := tpl.ExecuteTemplate(&buf, "orders.html", map[string]any{
		"Admin": a, "Games": games, "Game": "haitac", "Status": "failed",
		"Orders": []wallet.Order{{ID: 7, Username: "an", PackageID: "18001", Name: "10.000 Nguyên Bảo",
			SrvCode: "s1", AmountXu: 10000, Status: "failed", GrantMode: "pay", LastError: "console tu choi", Attempts: 1}},
		"Counts": map[string]int{"failed": 1},
	}); err != nil {
		t.Fatalf("render orders.html: %v", err)
	}
	if !bytes.Contains(buf.Bytes(), []byte("Phát lại")) {
		t.Errorf("orders.html thieu nut Phat lai cho don failed")
	}
}
