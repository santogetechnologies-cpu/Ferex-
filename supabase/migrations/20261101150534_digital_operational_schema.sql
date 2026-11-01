BEGIN;
CREATE TABLE IF NOT EXISTS public.digital_expenses(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title text NOT NULL,category text NOT NULL,amount numeric NOT NULL CHECK(amount>=0),
 project_id uuid REFERENCES public.digital_projects(id),vendor text,date date DEFAULT current_date,status text DEFAULT 'Pending',
 currency text DEFAULT 'INR',created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.digital_employees(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,role text,department text,email text,phone text,status text DEFAULT 'Active',
 salary numeric,rating numeric,"kpiScore" numeric,feedback text,"projectsCount" integer,"tasksCount" integer,
 created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.digital_attendance(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),employee_id uuid REFERENCES public.digital_employees(id),date date,user_email text,
 status text,check_in text,check_out text,hours numeric,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.digital_projects ADD COLUMN IF NOT EXISTS assigned_staff_id uuid, ADD COLUMN IF NOT EXISTS assigned_staff_email text,
 ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'Pending', ADD COLUMN IF NOT EXISTS advance_amount numeric DEFAULT 0,
 ADD COLUMN IF NOT EXISTS balance_amount numeric DEFAULT 0, ADD COLUMN IF NOT EXISTS advance_paid numeric DEFAULT 0,
 ADD COLUMN IF NOT EXISTS balance_paid numeric DEFAULT 0, ADD COLUMN IF NOT EXISTS client_name text,
 ADD COLUMN IF NOT EXISTS client_type text DEFAULT 'External', ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.digital_clients ADD COLUMN IF NOT EXISTS tax_id text,ADD COLUMN IF NOT EXISTS contract_value numeric;
ALTER TABLE public.digital_messages ADD COLUMN IF NOT EXISTS conversation_id text, ADD COLUMN IF NOT EXISTS contact_name text,
 ADD COLUMN IF NOT EXISTS contact_role text, ADD COLUMN IF NOT EXISTS is_self boolean DEFAULT true, ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.digital_messages ALTER COLUMN client_id DROP NOT NULL;
COMMIT;
