import re
import pathlib
path = pathlib.Path('backend/admin/categories.html')
text = path.read_text(encoding='utf-8')
# Add data-label-pt attribute for items that have data-label-fr and data-label-en and not already pt
pattern = re.compile(r'(data-label-fr="([^"]*)"\s+data-label-en="([^"]*)")')

# translation map for all known keys
lookup = {
    'Tableau de bord': 'Painel',
    'Produits': 'Produtos',
    'Catégories': 'Categorias',
    'Utilisateurs': 'Utilizadores',
    'Rôles': 'Funções',
    'Nos Spécialités Portugaises': 'Especialidades',
    'Commandes': 'Encomendas',
    'Clients': 'Clientes',
    'Analyse': 'Análise',
    'Paramètres': 'Configurações',
    'Langues': 'Línguas'
}

def repl(m):
    fr = m.group(2)
    pt = lookup.get(fr, fr)
    return f'data-label-fr="{fr}" data-label-pt="{pt}" data-label-en="{m.group(3)}"'

new_text = pattern.sub(repl, text)
path.write_text(new_text, encoding='utf-8')
print('updated', path)
