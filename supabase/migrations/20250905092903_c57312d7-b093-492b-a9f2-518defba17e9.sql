-- Add new fields to campaigns table for validation workflow
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS client_note text,
ADD COLUMN IF NOT EXISTS validation_requested_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS validated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS admin_reviewer uuid,
ADD COLUMN IF NOT EXISTS markets text[] DEFAULT '{}';

-- Update status enum to include new validation states
-- First check if we need to update existing status values
UPDATE campaigns 
SET status = 'pending_validation' 
WHERE status = 'pending';

-- Create admin_tasks table for tracking validation tasks
CREATE TABLE IF NOT EXISTS admin_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL,
    campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'open',
    assignee uuid,
    admin_comment text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    resolved_at timestamp with time zone
);

-- Enable RLS on admin_tasks
ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_tasks
CREATE POLICY "Admins can manage all admin tasks"
ON admin_tasks
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_tasks_campaign_id ON admin_tasks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_status ON admin_tasks(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- Create trigger to update updated_at on admin_tasks
CREATE TRIGGER update_admin_tasks_updated_at
    BEFORE UPDATE ON admin_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();