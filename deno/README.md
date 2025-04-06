# Deno Deploy API for Espaço Pessoal

This directory contains the Deno Deploy API for Espaço Pessoal, which includes a spellcheck service that uses OpenRouter API to check text for spelling, grammar, and style issues.

## Setup

1. Make sure you have Deno installed on your machine.
2. Copy `.env.example` to `.env` and fill in the required environment variables.
3. Add the OpenRouter API key to the `.env` file:
   ```
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```

## Local Development

To run the API locally:

```bash
cd deno
deno task dev
```

This will start the server on port 8000.

## Deployment

To deploy to Deno Deploy:

1. Make sure you have the Deno Deploy CLI installed:
   ```bash
   deno install -A -f -n deployctl https://deno.land/x/deploy/deployctl.ts
   ```

2. Deploy the API:
   ```bash
   deployctl deploy --project=espaco-pessoal-api main.ts
   ```

## API Endpoints

### Spellcheck API

- **URL**: `/api/spellcheck`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "text": "Text to check for spelling, grammar, and style issues"
  }
  ```
- **Response**:
  ```json
  {
    "diffs": [
      {
        "original": "incorrect text",
        "suggestion": "corrected text",
        "reason": "explanation",
        "start": 10,
        "end": 25
      }
    ]
  }
  ```

## Testing

You can test the spellcheck API using curl:

```bash
curl -X POST \
  https://api.espacopessoal.com/api/spellcheck \
  -H 'Content-Type: application/json' \
  -d '{"text": "This is a test of the spellcheck API."}'
```

## Troubleshooting

If you encounter issues with the spellcheck API:

1. Check the Deno Deploy logs for errors.
2. Verify that the OpenRouter API key is correctly set in the environment variables.
3. Make sure the CORS settings are correctly configured for your frontend domain. 