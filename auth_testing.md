# M11 CLUBE Auth Testing

## User Authentication (Mobile + MPIN)
- POST /api/auth/register {mobile, name, mpin} → returns {token, user}
- POST /api/auth/login {mobile, mpin} → returns {token, user}
- GET /api/auth/me (Bearer token) → returns user
- POST /api/auth/logout

## Admin Authentication (Email + Password)
- POST /api/admin/auth/login {email, password} → returns {token, admin}
- GET /api/admin/auth/me (Bearer token, role=admin) → returns admin

## Seed Credentials (read /app/memory/test_credentials.md)
- Admin: admin@m11clube.com / admin123
- Test user: 9999999999 / 1234

## Verification
```
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
```
Verify bcrypt hash starts with `$2b$`.
