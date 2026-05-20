import sys
import requests

def main():
    if len(sys.argv) < 2:
        print('Usage: fetch_analytics.py <token>')
        return
    token = sys.argv[1]
    url = 'http://localhost:8000/api/business/analytics'
    headers = {'Authorization': f'Bearer {token}'}
    resp = requests.get(url, headers=headers)
    print(resp.status_code)
    try:
        print(resp.json())
    except Exception:
        print(resp.text)

if __name__ == '__main__':
    main()
