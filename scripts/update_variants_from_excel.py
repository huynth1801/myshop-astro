#!/usr/bin/env python3
"""
Imports variant, price, and stock info from Shopee's mass_update_sales_info Excel export
into demo-catalog.sql and applies it to PostgreSQL.
"""
import zipfile
import xml.etree.ElementTree as ET
import json
import re
import os
import subprocess

EXCEL_PATH = '/Users/tgm-mac007/Downloads/mass_update_sales_info_515413675_20261013140152.xlsx'
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED_SQL_PATH = os.path.join(BASE_DIR, 'apps/api/src/main/resources/db/seed/demo-catalog.sql')

slug_to_shopee_id = {
    'ao-khoac-the-thao': '27650805549',
    'ao-the-thao-hanabi': '27859896457',
    'ao-croptop-chong-nang': '26550800899',
    'quan-don-mong-cap-cao': '26659159473',
    'set-tat-hanabi-5-doi': '28557993206',
    'khau-trang-chong-nang-uv': '24781637751',
    'khau-trang-vanh-che-3d': '26351680887',
    'dep-da-xo-ngon': '26805807824',
    'tat-gau-co-ngan-tui-rut': '26950805683',
    'dan-nguc-silicon-5-doi': '28909378723',
    'dan-ti-silicone-hanabi': '27755810906',
    'ao-lot-su-duc-khong-gong': '43055083094',
    'ao-nguc-su-duc-nang': '44155073198',
    'dai-nit-bung-thong-hoi': '25578855486',
    'day-ao-nguc-trong-suot': '26207532609',
    'gen-nit-bung-latex': '23464541636',
    'quan-gen-nit-bung-moc-cai': '29266026912',
    'quan-nano-sinh-nhiet-tan-mo': '28500801140',
    'quan-lot-cotton-khong-duong-may': '28452888791',
    'quan-lot-mac-trong-vay': '24078585771',
    'quan-lot-air-tang-hinh': '24028782965',
    'quan-lot-cotton-khang-khuan': '29006539518',
    'quan-lot-duc-su-chong-lo': '25485343680',
    'quan-lot-hanabi-su-lua': '26508002349',
    'quan-lot-duc-su-tim': '24678937899',
    'quan-lot-su-cap-cao': '24228586531',
    'set-4-quan-lot-hop-qua': '24278849692',
    'set-6-quan-chip': '24278851360',
    'set-3-quan-lot-mat-lanh': '29858925678',
}

slug_to_prefix = {
    'ao-khoac-the-thao': 'AOKHOA',
    'ao-the-thao-hanabi': 'AOTHET',
    'ao-croptop-chong-nang': 'AOCROP',
    'quan-don-mong-cap-cao': 'QUANDO',
    'set-tat-hanabi-5-doi': 'SETTAT',
    'khau-trang-chong-nang-uv': 'KHAUV',
    'khau-trang-vanh-che-3d': 'KHAU3D',
    'dep-da-xo-ngon': 'DEPDA',
    'tat-gau-co-ngan-tui-rut': 'TATGAU',
    'dan-nguc-silicon-5-doi': 'DANNGU',
    'dan-ti-silicone-hanabi': 'DANTI',
    'ao-lot-su-duc-khong-gong': 'AOLOT',
    'ao-nguc-su-duc-nang': 'AONGUC',
    'dai-nit-bung-thong-hoi': 'DAINIT',
    'day-ao-nguc-trong-suot': 'DAYAO',
    'gen-nit-bung-latex': 'GENNIT',
    'quan-gen-nit-bung-moc-cai': 'QUANGE',
    'quan-nano-sinh-nhiet-tan-mo': 'QUANNA',
    'quan-lot-cotton-khong-duong-may': 'QUANCO',
    'quan-lot-mac-trong-vay': 'QUANVA',
    'quan-lot-air-tang-hinh': 'QUANAIR',
    'quan-lot-cotton-khang-khuan': 'QUANKH',
    'quan-lot-duc-su-chong-lo': 'QUANCH',
    'quan-lot-hanabi-su-lua': 'QUANLU',
    'quan-lot-duc-su-tim': 'QUANTI',
    'quan-lot-su-cap-cao': 'QUANCA',
    'set-4-quan-lot-hop-qua': 'SET4QU',
    'set-6-quan-chip': 'SET6QU',
    'set-3-quan-lot-mat-lanh': 'SET3QU',
}

KNOWN_COLORS = {'da', 'đen', 'màu nude', 'nâu', 'xám', 'ghi', 'hồng', 'tím', 'trắng', 'xanh', 'tím than', 'xanh rêu', 'xanh lá'}

def parse_attributes(var_name):
    if not var_name:
        return {'size': 'Free size'}
    if ',' in var_name:
        p1, p2 = [p.strip() for p in var_name.split(',', 1)]
        if p1.lower() in KNOWN_COLORS or any(p1.lower().startswith(c) for c in KNOWN_COLORS):
            return {'color': p1, 'size': p2}
        elif p2.lower() in KNOWN_COLORS or any(p2.lower().startswith(c) for c in KNOWN_COLORS):
            return {'color': p2, 'size': p1}
        else:
            return {'color': p1, 'size': p2}
    else:
        vn = var_name.strip()
        if vn.lower() in KNOWN_COLORS or any(vn.lower().startswith(c) for c in KNOWN_COLORS):
            return {'color': vn}
        return {'size': vn}

def main():
    print(f'→ Đang đọc file Excel: {EXCEL_PATH}')
    with zipfile.ZipFile(EXCEL_PATH) as z:
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                text = ''.join(t.text for t in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text)
                shared_strings.append(text)

        tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        rows = []
        for r in tree.findall('.//s:row', ns):
            row_cells = {}
            for c in r.findall('s:c', ns):
                col_ref = ''.join(filter(str.isalpha, c.get('r', '')))
                val_el = c.find('s:v', ns)
                val = val_el.text if val_el is not None else None
                t = c.get('t')
                if t == 's' and val is not None:
                    val = shared_strings[int(val)]
                row_cells[col_ref] = val
            rows.append(row_cells)

    data_rows = rows[6:]
    shopee_id_to_rows = {}
    for r in data_rows:
        p_id = r.get('A')
        if p_id:
            shopee_id_to_rows.setdefault(p_id, []).append(r)

    product_slugs_ordered = list(slug_to_shopee_id.keys())
    slug_to_uuid = {slug: f'66666666-6666-6666-6666-{i+1:012d}' for i, slug in enumerate(product_slugs_ordered)}

    all_skus = set()
    sku_pattern = re.compile('^[A-Za-z0-9-]+$')
    variant_lines = []
    var_counter = 1

    for slug in product_slugs_ordered:
        p_uuid = slug_to_uuid[slug]
        s_id = slug_to_shopee_id[slug]
        p_rows = shopee_id_to_rows.get(s_id, [])
        prefix = slug_to_prefix[slug]

        for idx, r in enumerate(p_rows, 1):
            v_uuid = f'77777777-7777-7777-7777-{var_counter:012d}'
            var_counter += 1

            raw_sku = r.get('F')
            if raw_sku:
                clean = re.sub(r'[^A-Za-z0-9-]', '-', raw_sku.strip())
                clean = re.sub(r'-+', '-', clean).strip('-')
                sku = clean.upper()
            else:
                sku = f'{prefix}-{idx:02d}'

            orig = sku
            c = 1
            while sku in all_skus:
                sku = f'{orig}-{c}'
                c += 1
            all_skus.add(sku)
            assert sku_pattern.match(sku), f'SKU invalid: {sku}'

            price_vnd = int(r.get('G') or 0)
            price_cents = price_vnd * 100

            # compare_at ~25% higher if discounted, or NULL
            if idx % 3 != 0:
                compare_vnd = int(round(price_vnd * 1.25 / 1000) * 1000)
                compare_str = str(compare_vnd * 100)
            else:
                compare_str = 'NULL'

            stock = int(r.get('I') or 0)
            attrs = parse_attributes(r.get('D'))
            attrs_json = json.dumps(attrs, ensure_ascii=False).replace("'", "''")

            line = f"  ('{v_uuid}', '{p_uuid}', '{sku}', {price_cents}, {compare_str}, {stock}, '{attrs_json}')"
            variant_lines.append(line)

    print(f'→ Đã tạo {len(variant_lines)} variants cho {len(product_slugs_ordered)} sản phẩm.')

    # Ghi vào demo-catalog.sql
    with open(SEED_SQL_PATH, 'r', encoding='utf-8') as f:
        sql = f.read()

    # Tìm đoạn INSERT INTO product_variants
    pattern = re.compile(
        r'-- variants\s*\nINSERT INTO product_variants \(id, product_id, sku, price_cents, compare_at_price_cents, stock, attributes\) VALUES\s*\n(.*?);\s*\n\s*-- images',
        re.DOTALL
    )

    new_variants_sql = '-- variants\nINSERT INTO product_variants (id, product_id, sku, price_cents, compare_at_price_cents, stock, attributes) VALUES\n'
    new_variants_sql += ',\n'.join(variant_lines) + ';\n\n-- images'

    updated_sql, count = pattern.subn(new_variants_sql, sql)
    if count != 1:
        raise RuntimeError(f'Không thể thay thế đoạn INSERT INTO product_variants (matched: {count})')

    with open(SEED_SQL_PATH, 'w', encoding='utf-8') as f:
        f.write(updated_sql)

    print(f'✓ Đã cập nhật thành công {SEED_SQL_PATH}')

    # Nạp vào database Postgres
    print('→ Nạp dữ liệu vào cơ sở dữ liệu PostgreSQL `myshop`…')
    res = subprocess.run(['psql', '-d', 'myshop', '-v', 'ON_ERROR_STOP=1', '-f', SEED_SQL_PATH], capture_output=True, text=True)
    if res.returncode != 0:
        print('Lỗi psql stderr:', res.stderr)
        raise RuntimeError(f'psql thất bại với mã {res.returncode}')
    print('✓ Đã nạp thành công vào PostgreSQL!')

if __name__ == '__main__':
    main()
