import crypto from "crypto";
import fs from "fs";

export const createMD5 = (path: string) =>
  new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash("md5");
    const rs = fs.createReadStream(path);
    rs.on("error", reject);
    rs.on("data", (chunk) => hash.update(chunk));
    rs.on("end", () => resolve(hash.digest("hex")));
  });

/** Newer AWS SDK rejects placeholders like `__REGION__`. Spaces regions are nyc3, sfo3, etc. */
export const resolveSpacesLocation = (
  endpoint: string,
  explicitRegion = ""
): { region: string; endpoint: string } => {
  let hostname = "";
  let protocol = "https:";

  try {
    const url = new URL(endpoint);
    hostname = url.hostname;
    protocol = url.protocol;
  } catch {
    hostname = endpoint.replace(/^https?:\/\//, "").split("/")[0];
  }

  const labels = hostname.split(".");
  const spacesIdx = labels.indexOf("digitaloceanspaces");
  let inferredRegion = "";

  if (spacesIdx > 0) {
    const beforeSpaces = labels[spacesIdx - 1];
    inferredRegion =
      beforeSpaces === "cdn" && spacesIdx > 1
        ? labels[spacesIdx - 2]
        : beforeSpaces;
  }

  const region = explicitRegion || inferredRegion || "us-east-1";

  if (inferredRegion) {
    return {
      region,
      endpoint: `${protocol}//${inferredRegion}.digitaloceanspaces.com`,
    };
  }

  return { region, endpoint };
};
