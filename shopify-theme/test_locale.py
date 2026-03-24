import requests

def fetch(locale):
    url = f"http://127.0.0.1:9292/?locale={locale}"
    r = requests.get(url)
    print(locale, r.status_code)
    print(r.text.split('\n')[0:20])

if __name__ == '__main__':
    for loc in ['fr','pt','en']:
        fetch(loc)
