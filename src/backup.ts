import { exec, execSync } from "child_process";
import {
  S3Client,
  S3ClientConfig,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createReadStream, unlink, statSync } from "fs";
import { filesize } from "filesize";
import path from "path";
import os from "os";

import { env } from "./env.js";
import { createMD5, resolveSpacesLocation } from "./utils.js";

const uploadToSpaces = async ({
  name,
  path,
}: {
  name: string;
  path: string;
}) => {
  console.log("👉 Uploading backup to DigitalOcean Spaces...");

  const bucket = env.DO_SPACES_BUCKET;
  const { region, endpoint } = resolveSpacesLocation(env.DO_SPACES_ENDPOINT);

  const clientOptions: S3ClientConfig = {
    region,
    forcePathStyle: true,
    endpoint,
    credentials: {
      accessKeyId: env.DO_SPACES_ACCESS_KEY_ID,
      secretAccessKey: env.DO_SPACES_SECRET_ACCESS_KEY,
    },
  };

  console.log(`✅ Using DigitalOcean Spaces endpoint: ${endpoint}`);
  console.log(`✅ Using DigitalOcean Spaces region: ${region}`);

  if (env.BUCKET_SUBFOLDER) {
    name = env.BUCKET_SUBFOLDER + "/" + name;
  }

  let params: PutObjectCommandInput = {
    Bucket: bucket,
    Key: name,
    Body: createReadStream(path),
  };

  if (env.SUPPORT_OBJECT_LOCK) {
    console.log("👉 MD5 hashing file...");

    const md5Hash = await createMD5(path);

    console.log("✅ Done hashing file");

    params.ContentMD5 = Buffer.from(md5Hash, "hex").toString("base64");
  }

  const client = new S3Client(clientOptions);

  await new Upload({
    client,
    params: params,
  }).done();

  console.log("✅ Backup uploaded to DigitalOcean Spaces...");
};

const dumpToFile = async (filePath: string) => {
  console.log("👉 Dumping DB to file...");
  console.log(
    "👉 Database URL:",
    env.BACKUP_DATABASE_URL.replace(/\/\/.*@/, "//***:***@")
  ); // Hide credentials in logs

  await new Promise((resolve, reject) => {
    const pgDumpCommand = `pg_dump --dbname=${env.BACKUP_DATABASE_URL} --format=tar ${env.BACKUP_OPTIONS} | gzip > ${filePath}`;
    console.log("👉 Executing pg_dump command...");

    exec(pgDumpCommand, (error, stdout, stderr) => {
      console.log("✅ pg_dump completed");

      if (error) {
        console.error("❌ pg_dump error:", error);
        console.error("❌ stderr:", stderr);
        reject({ error: error, stderr: stderr.trimEnd() });
        return;
      }

      // Check if file was created and has content
      try {
        const fileStats = statSync(filePath);
        console.log("✅ Backup file created, size:", filesize(fileStats.size));

        if (fileStats.size === 0) {
          reject({
            error: "❌ Backup file is empty - pg_dump may have failed silently",
            stderr: stderr.trimEnd(),
          });
          return;
        }

        // Check if archive is valid and contains data
        console.log("👉 Validating backup archive...");
        const isValidArchive =
          execSync(`gzip -cd ${filePath} | head -c1`).length == 1
            ? true
            : false;

        if (isValidArchive == false) {
          console.error("❌ Archive validation failed");
          console.error("File size:", filesize(fileStats.size));
          console.error("stderr:", stderr);
          reject({
            error:
              "❌ Backup archive file is invalid or empty; check for errors above",
            stderr: stderr.trimEnd(),
          });
          return;
        }

        console.log("✅ Backup archive file is valid");
        console.log("✅ Backup filesize:", filesize(fileStats.size));

        // not all text in stderr will be a critical error, print the error / warning
        if (stderr != "") {
          console.log("✅ pg_dump warnings:", stderr.trimEnd());
          console.log(
            `⚠️  Potential warnings detected; Please ensure the backup file "${path.basename(
              filePath
            )}" contains all needed data`
          );
        }

        resolve(undefined);
      } catch (statError) {
        console.error("❌ Error checking backup file:", statError);
        reject({
          error: "Failed to validate backup file",
          stderr: stderr.trimEnd(),
        });
      }
    });
  });

  console.log("✅ DB dumped to file successfully");
};

const deleteFile = async (path: string) => {
  console.log("👉 Deleting local file...");
  await new Promise((resolve, reject) => {
    unlink(path, (err) => {
      reject({ error: err });
      return;
    });
    resolve(undefined);
  });
};

export const backup = async () => {
  console.log("👉 Initiating DB backup to DigitalOcean Spaces...");

  const date = new Date().toISOString();
  const timestamp = date.replace(/[:.]+/g, "-");
  const filename = `${env.BACKUP_FILE_PREFIX}-${timestamp}.tar.gz`;
  const filepath = path.join(os.tmpdir(), filename);

  await dumpToFile(filepath);
  await uploadToSpaces({ name: filename, path: filepath });
  await deleteFile(filepath);

  console.log("✅ DB backup to DigitalOcean Spaces complete...");
};
