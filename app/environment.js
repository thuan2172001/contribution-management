import 'dotenv/config';

export const { SERVER_PORT } = process.env;
export const { MONGODB_URL } = process.env;
export const { MONGODB_USER } = process.env;
export const { MONGODB_PASS } = process.env;
export const { MONGODB_DATABASE } = process.env;
export const { NODE_ENV } = process.env;
export const PORT = process.env.PORT ? process.env.PORT : SERVER_PORT;
export const { PROJECT_NAME } = process.env;
export const { MONGODB_PORT } = process.env;
export const { API_PREFIX } = process.env;
export const { CHECK_AUTH } = process.env;
export const { CHECK_CHANGE_PASSWORD } = process.env;
export const { SEED_DATA } = process.env;
export const { URL_PRODUCTION } = process.env;
export const { CHECK_REQUEST_SIGNATURE } = process.env;
export const { CHECK_BLOCKCHAIN } = process.env;
export const { BLOCKCHAIN_URL } = process.env;
export const { PREFIX_BLOCKCHAIN_ID } = process.env;
export const { VERSION } = process.env;
export const { TOTAL_QR } = process.env;
export const { NUMBER_QR_PER_PAGE } = process.env;
export const { CONCURRENT } = process.env;
// export const TOTAL_QR = 10000;
// export const NUMBER_QR_PER_PAGE = 10;
// export const CONCURRENT = 3;
