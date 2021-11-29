/* eslint-disable import/prefer-default-export */
export const safeFileRename = (chosen: string) => {
  let safeFilename = String(chosen);
  safeFilename = safeFilename.replace('"', "'");
  safeFilename = safeFilename.replace(':', '|');
  return safeFilename;
};
