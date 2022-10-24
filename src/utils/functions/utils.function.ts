import { BadRequestException, HttpStatus, Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as xlsx from 'xlsx';
import * as bcrypt from 'bcrypt';
import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs';
import * as AWS from 'aws-sdk';
import {
  BaseResponseTypeDTO,
  PaginationRequestType,
  PaginationResponseType,
} from '@utils/types/utils.types';
import { v4 as uuidv4 } from 'uuid';
import { FindManyOptions, Repository } from 'typeorm';

dotenv.config();

const {
  AWS_BUCKET_NAME,
  AWS_KEY_NAME,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
} = process.env;

const logger = new Logger('UtilFunctions');

export const generateUniqueCode = (length = 6): string =>
  (uuidv4() as string).substring(0, length);

export const extractExcelSheetData = <T>(path: string): T[] => {
  try {
    let errorMessage: string;
    const excelSheetRead = xlsx.readFile(path, { cellDates: true });
    if (excelSheetRead.SheetNames?.length > 0) {
      const sheetName: string = excelSheetRead.SheetNames[0];
      const targetExcelSheet: string = excelSheetRead.SheetNames.find(
        (s: string) => s === sheetName,
      );
      if (targetExcelSheet) {
        const excelWorkSheet: xlsx.WorkSheet = excelSheetRead.Sheets[sheetName];
        const extractedContent: T[] = xlsx.utils.sheet_to_json(excelWorkSheet);
        //Delete the uploaded File after reading
        fs.unlinkSync(path);
        return extractedContent;
      }
    } else {
      errorMessage = 'This file does not contain any sheets';
    }
    //Delete the uploaded File after reading
    fs.unlinkSync(path);
    if (errorMessage) {
      logger.error(errorMessage);
      throw new BadRequestException();
    }
  } catch (ex) {
    logger.error(ex);
    throw ex;
  }
};

export const compareEnumValues = (value: string, checkAgainst: string[]) => {
  return checkAgainst.includes(value);
};

export const compareEnumValueFields = (
  value: string,
  checkAgainst: string[],
  fieldName?: string,
): void => {
  if (!compareEnumValues(value, checkAgainst)) {
    const message = `Field '${
      fieldName ?? value
    }' can only contain values: ${checkAgainst}`;
    throw new BadRequestException(message);
  }
};

export const checkForRequiredFields = (
  requiredFields: string[],
  requestPayload: any,
): void => {
  const missingFields = requiredFields.filter(
    (field: string) =>
      Object.keys(requestPayload).indexOf(field) < 0 ||
      Object.values(requestPayload)[
        Object.keys(requestPayload).indexOf(field)
      ] === '',
  );
  if (missingFields.length) {
    throw new BadRequestException(
      `Missing required field(s): '${[...missingFields]}'`,
    );
  }
};

export const validateEmailField = (email: string): void => {
  if (!validateEmail(email)) {
    throw new BadRequestException('Field email has invalid format');
  }
};

export const hashPassword = async (rawPassword: string): Promise<string> => {
  return await new Promise((resolve, reject) => {
    bcrypt.hash(rawPassword, 10, (err, hash) => {
      if (err) {
        reject(err);
      }
      resolve(hash);
    });
  });
};

export const verifyPasswordHash = async (
  rawPassword: string,
  encryptedPassword: string,
): Promise<string> => {
  return await new Promise((resolve, reject) => {
    bcrypt.compare(rawPassword, encryptedPassword, (err, passwordMatch) => {
      if (err) {
        reject(err);
      }
      resolve(passwordMatch);
    });
  });
};

export const uploadFileToS3 = async (
  filePath: string,
  deleteAfterUpload = false,
): Promise<string> => {
  try {
    const awsConfigOptions: AWS.S3.ClientConfiguration = {
      accessKeyId: String(AWS_ACCESS_KEY_ID).trim(),
      secretAccessKey: String(AWS_SECRET_ACCESS_KEY).trim(),
    };
    const s3: AWS.S3 = new AWS.S3(awsConfigOptions);
    //Create a readstream for the uploaded files
    const createdReadStream = fs.createReadStream(filePath);

    //Create AWS Params object
    const awsBucketParams: AWS.S3.PutObjectRequest = {
      Bucket: String(AWS_BUCKET_NAME).trim(),
      Key: `${String(AWS_KEY_NAME).trim()}/${filePath}`,
      Body: createdReadStream,
      ACL: 'public-read',
    };

    //Upload file to AWS storage bucket
    const result = await s3.upload(awsBucketParams).promise();

    if (result && deleteAfterUpload) {
      fs.unlinkSync(filePath);
    }
    return result.Location;
  } catch (ex) {
    logger.error(ex);
    throw ex;
  }
};

export const removeKeyFromObject = (obj: any, keys: string[]): any => {
  for (const prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      switch (typeof obj[prop]) {
        case 'object':
          if (keys.indexOf(prop) > -1) {
            delete obj[prop];
          } else {
            //? this handle nested objects
            //? throws Range call stack exceed error
            //? Todo, find a fix for this
            removeKeyFromObject(obj[prop], keys);
          }
          break;
        default:
          if (keys.indexOf(prop) > -1) {
            delete obj[prop];
          }
          break;
      }
    }
  }
  return obj;
};

export const convertEnumToArray = <T, U>(enumData: U): T[] =>
  Object.values(enumData);

export const shuffleArray = <T>(array: T[]): T[] => {
  return array.length > 0 ? array.sort(() => Math.random() - 0.5) : array;
};

export const groupBy = <T>(list: T[], key: string): any => {
  return list.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};

export const validateURL = (url: string): boolean => {
  const regEx =
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
  return regEx.test(url);
};

export const validateEmail = (email: string): boolean => {
  const regExp =
    /^[a-zA-Z0-9.!#$%&’*+\/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  return regExp.test(email);
};

export const calculatePaginationControls = async <T>(
  repository: Repository<T>,
  options: FindManyOptions<T>,
  payload: PaginationRequestType,
): Promise<{ paginationControl: PaginationResponseType; response: T[] }> => {
  const [response, total] = await repository.findAndCount(options);
  return {
    paginationControl: {
      totalPages: Math.ceil(total / payload?.pageSize),
      currentPage: payload?.pageNumber,
      pageSize: payload?.pageSize,
      hasNext: payload?.pageNumber < Math.ceil(total / payload?.pageSize),
      hasPrevious: payload?.pageNumber > 1,
      totalCount: total,
    },
    response,
  };
};

export const calculatePagination = <T>(
  fullArrayItems: T[],
  payload: PaginationRequestType,
): { paginationControl: PaginationResponseType; response: T[] } => {
  const total = fullArrayItems.length ?? 0;
  const response = fullArrayItems.slice(
    (payload.pageNumber - 1) * payload.pageSize,
    payload.pageNumber * payload.pageSize,
  );
  return {
    paginationControl: {
      totalPages: Math.ceil(total / payload?.pageSize),
      currentPage: payload?.pageNumber,
      pageSize: payload?.pageSize,
      hasNext: payload?.pageNumber < Math.ceil(total / payload?.pageSize),
      hasPrevious: payload?.pageNumber > 1,
      totalCount: total,
    },
    response,
  };
};

export const createLogFile = (path: string): void => {
  const pathSegments = path.split('/');
  if (pathSegments?.length <= 1) {
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, '');
    }
  } else {
    const dir = pathSegments.slice(0, pathSegments.length - 1).join('/');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, '');
    }
  }
};

export const saveLogToFile = (error: any) => {
  try {
    const fileName = 'logs/response-log.txt';
    createLogFile(fileName);

    const errorData = typeof error === 'object' ? JSON.stringify(error) : error;
    const file = fs.createWriteStream(fileName, { flags: 'a' });
    const formattedData = `
      ========${new Date().toISOString()}=============\n
      ${errorData}
      ===============================================\n
    `;
    file.write(formattedData);
  } catch (ex) {
    throw ex;
  }
};

export const sendEmail = async (
  html: string,
  subject: string,
  recipientEmails: string[],
): Promise<BaseResponseTypeDTO> => {
  const serverHost = 'smtp.gmail.com';
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: serverHost,
    port: 465,
    auth: {
      user: process.env.EMAIL_ADMIN,
      pass: process.env.EMAIL_PASS,
    },
  });
  const mailOptions = {
    from: `Registree <${process.env.EMAIL_ADMIN}>`,
    to: recipientEmails.join(','),
    subject,
    html,
  };
  try {
    const response: any = await new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          reject(error);
        }
        resolve(info);
      });
    });
    if (response?.messageId) {
      return {
        message: `Nodemailer sent message: ${response.messageId}`,
        code: HttpStatus.OK,
        success: true,
      };
    }
  } catch (ex) {
    logger.error(ex);
    return {
      success: false,
      message: 'Email not sent',
      code: HttpStatus.OK,
    };
  }
};

export const httpGet = async <T>(url: string, headers = {}): Promise<T> => {
  try {
    const response: AxiosResponse = await axios.get(url, { headers });
    return response.data as T;
  } catch (error) {
    throw error;
  }
};

export const httpPost = async <U, T>(
  url: string,
  payload: T,
  headers = {},
): Promise<U> => {
  try {
    const response: AxiosResponse = await axios.post(url, payload, { headers });
    return response.data as U;
  } catch (error) {
    throw error;
  }
};

export const calculatePercentage = (number: number, percentage: number) =>
  (number / 100) * percentage;

export const validateUUID = (uuid: string): boolean => {
  const regExp =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return regExp.test(uuid);
};

export const validateUUIDField = (uuid: string, field = 'id'): void => {
  if (!validateUUID(uuid)) {
    throw new BadRequestException(`Field ${field} has invalid UUID format`);
  }
};
