-- Rename buyer_contacts columns to follow PostgreSQL conventions (snake_case, lowercase)
ALTER TABLE buyer_contacts RENAME COLUMN "Country" TO country;
ALTER TABLE buyer_contacts RENAME COLUMN "General Email" TO email;
ALTER TABLE buyer_contacts RENAME COLUMN "Company" TO company_name;
ALTER TABLE buyer_contacts RENAME COLUMN "Website" TO website_url;
ALTER TABLE buyer_contacts RENAME COLUMN "Street" TO street;
ALTER TABLE buyer_contacts RENAME COLUMN "City" TO city;
ALTER TABLE buyer_contacts RENAME COLUMN "Postal Code" TO postal_code;
ALTER TABLE buyer_contacts RENAME COLUMN "Phone" TO phone;
ALTER TABLE buyer_contacts RENAME COLUMN "State" TO state;