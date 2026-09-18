# Facebook Redirect Checker - khong can dang nhap

Tool nay chi lam mot viec: mo tung URL Facebook trong Chromium **khong dang nhap**, cho redirect on dinh, sau do ghi lai URL cuoi cung va so sanh voi URL goc.

Vi du:

- URL goc: `https://www.facebook.com/groups/477220950105282/posts/25962265036690693/`
- URL sau redirect: `https://www.facebook.com/groups/2417591631584698/posts/25962265036690693/`
- `url_changed = True`
- `group_changed = True`
- `status = GROUP_CHANGED`

## Cach dung tren Windows

1. Giai nen ZIP.
2. Chay `scripts\setup-windows.bat` mot lan.
3. Test nhanh: chay `scripts\test-one-url.bat`.
4. Check file hien tai: chay `scripts\run-current-file.bat`.
5. Check file khac: keo-tha CSV/XLSX vao `scripts\run-checker.bat`.

Khong co buoc dang nhap Facebook. Tool tao mot browser context moi moi lan chay va khong luu session.

## Ket qua

Tool tao hai file canh file input, hoac trong `data\output` khi chay cac script co san:

- `<ten_file>_redirect_checked.csv`
- `<ten_file>_redirect_checked.xlsx`

Cac cot quan trong:

- `url_changed`: `True` neu URL co thay doi co y nghia.
- `group_changed`: `True` neu group ID thay doi.
- `status`:
  - `SAME_URL`: khong doi.
  - `GROUP_CHANGED`: group ID doi.
  - `URL_CHANGED`: URL doi nhung van la group URL.
  - `POST_DELETED`: bai viet da bi xoa/goc khoi group.
  - `LOGIN_REDIRECT`: bi dua sang trang login.
  - `REDIRECT_OTHER`: redirect sang dang URL khac.
- `check_error`: Lỗi kết nối / timeout (nếu có).

Tool bo qua khac biet chi do query tracking, fragment, `m.facebook.com`/`www.facebook.com` va dau `/` cuoi URL de tranh bao sai.

## Lenh truc tiep

```bat
python src\fb_redirect_checker.py data\input\data-1787537778460.csv --resume --output data\output\redirect-result
```

Chi test 5 dong:

```bat
python src\fb_redirect_checker.py data\input\data-1787537778460.csv --limit 5
```

Chay an cua so Chromium:

```bat
python src\fb_redirect_checker.py data\input\data-1787537778460.csv --headless
```

Mac dinh tool de browser hien thi vi cach nay gan voi viec ban paste URL vao Chrome hon headless.

## Cau truc thu muc

- `src/`: ma nguon Python.
- `scripts/`: cac lenh tien dung cho Windows.
- `data/input/`: du lieu dau vao mau.
- `data/output/`: ket qua da xu ly.
- `archive/`: goi ZIP cu de luu tru.
