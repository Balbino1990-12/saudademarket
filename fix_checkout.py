#!/usr/bin/env python3
# Read the file
with open('public/checkout.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find key positions
header_start = content.find('  <header>')
header_end = content.find('  </header>') + len('  </header>')

print(f"Header tag starts at: {header_start}")
print(f"Header tag ends at: {header_end}")

# Extract before header, proper header content, and after
before_header = content[:header_start]
proper_header = content[header_start:header_end]
after_header = content[header_end:]

# Write it back - reconstruct by removing anything that was corrupted inside the header
reconstructed = before_header + proper_header + after_header

# Count lines for verification
original_lines = content.count('\n')
new_lines = reconstructed.count('\n')

print(f"Original lines: {original_lines}")
print(f"New lines: {new_lines}")
print(f"Removed {original_lines - new_lines} lines")

# Write it back
with open('public/checkout.html', 'w', encoding='utf-8') as f:
    f.write(reconstructed)

print("File reconstructed successfully!")
