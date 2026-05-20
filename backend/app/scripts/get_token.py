import asyncio
import sys
from backend.app.core.database import AsyncSessionLocal
import backend.app.services.auth_service as auth_service

async def main():
    if len(sys.argv) < 3:
        print('Usage: python get_token.py <username> <password>')
        return
    username = sys.argv[1]
    password = sys.argv[2]
    async with AsyncSessionLocal() as db:
        token = await auth_service.login_user(db, username, password)
        if token is None:
            print('Login failed')
        else:
            print(token)

if __name__ == '__main__':
    asyncio.run(main())
