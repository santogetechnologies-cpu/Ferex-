-- AI provider keys are now server-side secrets (ai-proxy Edge Function). Remove any that were stored in settings,
-- where every signed-in user could read them.
UPDATE public.system_config
SET value = jsonb_set(value, '{ai_config}', (value->'ai_config') - 'openai_api_key' - 'openrouter_api_key'),
    updated_at = now()
WHERE key = 'ferex_system_customization_config' AND value ? 'ai_config';
