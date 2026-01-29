import { configDotenv } from 'dotenv';
import { app } from './application/app';
import { logger } from './application/logging';

configDotenv();

const PORT = process.env.PORT;

app.listen(PORT, () => {
  logger.info(`Listening on Port: ${PORT}`);
});
