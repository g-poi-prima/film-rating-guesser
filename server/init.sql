-- Assicurati che PostgreSQL sia in esecuzione e crea il database:
-- createdb film_rating_guessr
-- Oppure via psql:
-- CREATE DATABASE film_rating_guessr;

-- Poi esegui le migrazioni Prisma:
-- npx prisma migrate dev

-- Per creare un utente admin manualmente (esempio):
-- UPDATE "User" SET role = 'ADMIN' WHERE username = 'admin';
