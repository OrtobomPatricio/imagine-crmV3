import os
import re

import glob

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Match db.insert(table).values({ or tx.insert(table).values({
    # We will look for .values({
    # and if we are inside a context that has 	enantId requirement, we inject it.
    
    # Actually, a simple regex to add 	enantId: ctx.tenantId, right after .values({
    # Warning: some are .values([{ ... }])
    
    new_content = re.sub(
        r'\.values\(\s*\{',
        r'.values({\n                    tenantId: ctx.tenantId,',
        content
    )
    
    # for arrays: .values([{
    new_content = re.sub(
        r'\.values\(\s*\[\s*\{',
        r'.values([{\n                    tenantId: ctx.tenantId,',
        new_content
    )

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Patched {file_path}")

for f in glob.glob('server/routers/*.ts'):
    process_file(f)

# Also meta-routes.ts
process_file('server/meta-routes.ts')
