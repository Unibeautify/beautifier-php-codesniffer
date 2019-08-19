import {
  Beautifier,
  BeautifierBeautifyData,
  DependencyType,
  ExecutableDependency,
  RunOptions,
} from "unibeautify";
import * as readPkgUp from "read-pkg-up";
import * as fs from "fs";
import * as path from "path";

const pkg = readPkgUp.sync({ cwd: __dirname })!.package;

export const beautifier: Beautifier = {
  name: "PHP_CodeSniffer",
  package: pkg,
  badges: [
    {
      description: "Build Status",
      url:
        "https://travis-ci.com/Unibeautify/beautifier-php-codesniffer.svg?branch=master",
      href: "https://travis-ci.com/Unibeautify/beautifier-php-codesniffer",
    },
  ],
  options: {
    PHP: true,
  },
  dependencies: [
    {
      type: DependencyType.Executable,
      name: "PHPCBF", // PHP Code Beautifier and Fixer
      program: "phpcbf",
      parseVersion: [/version (\d+\.\d+\.\d+)/],
      homepageUrl: "https://github.com/squizlabs/PHP_CodeSniffer",
      installationUrl:
        "https://github.com/squizlabs/PHP_CodeSniffer#installation",
      bugsUrl: "https://github.com/squizlabs/PHP_CodeSniffer/issues",
      badges: [
        {
          description: "Build Status",
          url:
            "https://travis-ci.org/squizlabs/PHP_CodeSniffer.svg?branch=phpcs-fixer",
          href: "https://travis-ci.org/squizlabs/PHP_CodeSniffer",
        },
        {
          description: "Code Consistency",
          url:
            "https://squizlabs.github.io/PHP_CodeSniffer/analysis/squizlabs/PHP_CodeSniffer" +
            "/grade.svg",
          href:
            "https://squizlabs.github.io/PHP_CodeSniffer/analysis/squizlabs/PHP_CodeSniffer",
        },
        {
          description: "Gitter",
          url: "https://badges.gitter.im/Join%20Chat.svg",
          href:
            "https://gitter.im/squizlabs/PHP_CodeSniffer?utm_source=badge&utm_medium=badge&" +
            "utm_campaign=pr-badge&utm_content=badge",
        },
      ],
    },
  ],
  resolveConfig: ({ filePath, projectPath }) => {
    const configFiles: string[] = [
      "phpcs.xml",
      "phpcs.xml.dist",
      "phpcs.ruleset.xml",
      "ruleset.xml",
    ];
    return findFile({
      finishPath: projectPath,
      startPath: filePath,
      fileNames: configFiles,
    })
      .then(configFile => ({ filePath: configFile }))
      .catch(err => {
        // tslint:disable-next-line no-console
        console.log(err);
        return Promise.resolve({});
      });
  },
  beautify({
    text,
    dependencies,
    filePath,
    beautifierConfig,
    projectPath,
  }: BeautifierBeautifyData) {
    const phpcbf = dependencies.get<ExecutableDependency>("PHPCBF");
    const rootDir = projectPath || (filePath && path.basename(filePath));
    const relFilePath =
      filePath && rootDir && relativizePaths([filePath], rootDir)[0];
    const args = [relFilePath && `--stdin-path=${relFilePath}`, "-"];
    const options: RunOptions = rootDir
      ? {
          cwd: rootDir,
        }
      : {};
    return phpcbf
      .run({ args, stdin: text, options })
      .then(({ exitCode, stderr, stdout }) => {
        if (stderr) {
          return Promise.reject(stderr);
        }
        return Promise.resolve(stdout);
      });
  },
};

function findFile({
  finishPath = "/",
  startPath = finishPath,
  fileNames,
}: {
  startPath: string | undefined;
  finishPath: string | undefined;
  fileNames: string[];
}): Promise<string> {
  const filePaths = fileNames.map(fileName => path.join(startPath, fileName));
  return Promise.all(filePaths.map(doesFileExist))
    .then(exists => filePaths.filter((filePath, index) => exists[index]))
    .then(foundFilePaths => {
      if (foundFilePaths.length > 0) {
        return foundFilePaths[0];
      }
      if (startPath === finishPath) {
        return Promise.reject("No config file found");
      }
      const parentDir = path.resolve(startPath, "../");
      return findFile({ startPath: parentDir, finishPath, fileNames });
    });
}

function doesFileExist(filePath: string): Promise<boolean> {
  return new Promise(resolve => {
    fs.access(filePath, fs.constants.R_OK, error => resolve(!error));
  });
}

function relativizePaths(args: string[], basePath: string): string[] {
  return args.map(arg => {
    const isTmpFile =
      typeof arg === "string" &&
      !arg.includes(":") &&
      path.isAbsolute(arg) &&
      path.dirname(arg).startsWith(basePath);
    if (isTmpFile) {
      return path.relative(basePath, arg);
    }
    return arg;
  });
}

export default beautifier;
