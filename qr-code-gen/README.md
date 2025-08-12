# O-Quest QR Code Generator

## Development

1. Follow the instructions in the `backend` directory's `README.md` to create the `backend/data/qr.txt` file.

2. Copy the `.env.example` file to `.env`

3. Replace the default value with the content of the `qr.txt` file

4. Update the value in the GitHub repository's [Actions secrets and variables](https://github.com/ScottyLabs/quest/settings/secrets/actions/VITE_DATA_BASE64) menu

This file contains the challenge verification strings. They're technically not sensitive, but care should be taken to ensure they are not easily accessible.
