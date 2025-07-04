
CREATE TABLE drills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid REFERENCES auth.users (id),
    name text,
    description text,
    duration integer,
    court_elements jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE routines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid REFERENCES auth.users (id),
    name text,
    description text,
    drill_ids jsonb,
    created_at timestamp with time zone DEFAULT now()
);
