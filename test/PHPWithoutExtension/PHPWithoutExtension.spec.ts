import * as fs from "fs";
import * as path from "path";

import { newUnibeautify, Beautifier } from "unibeautify";
import beautifier from "../../src";
import { raw } from "../utils";

test(`should successfully beautify php file without extension`, () => {
  const filePath: string = path.resolve(__dirname, `PHPWithoutExtension`);
  const text: string = fs.readFileSync(filePath).toString();
  const unibeautify = newUnibeautify();
  unibeautify.loadBeautifier(beautifier);
  return unibeautify
    .beautify({
      filePath,
      languageName: "PHP",
      options: {
        PHP: {
          PHP_CodeSniffer: {
            prefer_beautifier_config: true,
          },
        } as any,
      },
      text,
    })
    .then(results => {
      expect(raw(results)).toMatchSnapshot();
    });
});
