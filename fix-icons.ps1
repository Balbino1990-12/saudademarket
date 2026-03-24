$replacements = @{
    'products.html' = @(
        @{ old = 'ðŸ”§"Â¦'; new = 'ðŸ“¦' },
        @{ old = 'ðŸ”§"â€¹'; new = 'ðŸ“‹' },
        @{ old = 'ðŸ”§"â€š'; new = 'ðŸ“‚' },
        @{ old = 'ðŸ”§Â·'; new = 'ðŸ·' },
        @{ old = 'ðŸ”§â€º''; new = 'ðŸ¥«' },
        @{ old = 'ðŸ”§'Â°'; new = 'ðŸ’°' },
        @{ old = 'ðŸ”§"'; new = 'ðŸ“' },
        @{ old = 'ðŸ”§"â€ž'; new = 'â„¹ï¸' },
        @{ old = 'ðŸ”§'Â¾'; new = 'ðŸ’¾' }
    );
    'users.html' = @(
        @{ old = 'ðŸ”§'Â¥'; new = 'ðŸ‘¥' },
        @{ old = 'ðŸ”§"'; new = 'ðŸ“' },
        @{ old = 'ðŸ”§'Â¤'; new = 'ðŸ“‹' }
    );
    'categories.html' = @(
        @{ old = 'ðŸ”§"â€š'; new = 'ðŸ“‚' },
        @{ old = 'ðŸ”§"â€¹'; new = 'ðŸ“‹' },
        @{ old = 'ðŸ”§"Â¦'; new = 'ðŸ“¦' }
    );
    'roles.html' = @(
        @{ old = 'ðŸ”§"'; new = 'ðŸ“' },
        @{ old = 'ðŸ”§'Â¾'; new = 'ðŸ’¾' }
    );
    'index.html' = @(
        @{ old = 'ðŸ”§'; new = 'âš™ï¸' }
    )
}

$basePath = 'backend/admin'
$fixed = 0

foreach ($file in $replacements.Keys) {
    $filePath = Join-Path $basePath $file
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Encoding UTF8 -Raw
        
        foreach ($replace in $replacements[$file]) {
            $before = $content.Length
            $content = $content.Replace($replace['old'], $replace['new'])
            $after = $content.Length
            
            if ($before -ne $after) {
                $fixed++
                Write-Host "  âœ“ $file: Fixed $($replace['old']) -> $($replace['new'])"
            }
        }
        
        Set-Content $filePath $content -Encoding UTF8
    }
}

Write-Host "
Total replacements: $fixed"
