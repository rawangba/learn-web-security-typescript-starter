import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from "express";
import { sendErrorPage } from "./errors.ts";

export function validateRequestOrigin(appOrigin: string): RequestHandler {
  return (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }

    const origin = req.header("Origin");
    if (origin) {
      if (origin !== appOrigin) {
        sendErrorPage(res, 403, "Deceptive origin attempt", "The request did not come from the app");
	return;
      }
      next();
      return;
    }
    
    const referer = req.header("Referer");
    if (referer) {
      try {
        const refererURL = new URL(referer);
        const appURL = new URL(appOrigin);
        if (refererURL.origin !== appURL.origin) {
          sendErrorPage(res, 403, "Deceptive origin attempt", "The request did not come from the app");
	  return;
        }
        next();
        return;
      } catch (error) {
        sendErrorPage(res, 403, "Bad URL", "The request came from an invalid URL");
        return;
      }
    }
      
  
    sendErrorPage(res, 403, "Cannot determine request", "No origin or referer was found in the request");
    return;
  };
}

export function csrfTokensMatch(expected: string, actual: unknown): boolean {
  if (typeof actual !== "string") {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  const test = timingSafeEqual(expectedBuffer, actualBuffer);
  return test;
}
