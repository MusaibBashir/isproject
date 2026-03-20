-- ============================================
-- Migration: Daily Token Number Reset
-- Replaces create_order_token to use per-day
-- token numbering (resets to 1 each new day).
-- Run this in Supabase SQL Editor.
-- ============================================

-- Drop first because return type/OUT params are changing
DROP FUNCTION IF EXISTS public.create_order_token(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.create_order_token(
  p_sale_id UUID,
  p_business_account_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  token_number INT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_number INT;
  v_token_id UUID;
BEGIN
  -- Daily-reset token number: count today's tokens for this business + 1
  SELECT COALESCE(MAX(ot.token_number), 0) + 1
  INTO v_token_number
  FROM order_tokens ot
  WHERE ot.business_account_id = p_business_account_id
    AND DATE(ot.created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE AT TIME ZONE 'Asia/Kolkata';

  INSERT INTO order_tokens (
    sale_id,
    business_account_id,
    token_number,
    status,
    notes,
    created_at
  ) VALUES (
    p_sale_id,
    p_business_account_id,
    v_token_number,
    'ordered',
    p_notes,
    NOW()
  )
  RETURNING order_tokens.id, order_tokens.token_number, order_tokens.status, order_tokens.created_at
  INTO v_token_id, v_token_number, id, created_at;

  -- Return the new token row
  RETURN QUERY
  SELECT ot.id, ot.token_number, ot.status, ot.created_at
  FROM order_tokens ot
  WHERE ot.id = v_token_id;
END;
$$;
