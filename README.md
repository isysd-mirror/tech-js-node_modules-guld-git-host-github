# guld-git-path

Guld tool for getting the git directory of a path, or converting local paths into git-friendly repo names.

### Example Output

```
/home/isysd/tech/js/node_modules/guld-git-path/.git
```

### Install

```
npm i -g guld-git-path
```

### Usage

```
// async
getGitDir().then(console.log)
```

##### Node

```
const { getGitDir } = require('guld-git-path')
```

##### CLI

```
  Usage: guld-git-path [options]

  Guld tool for getting the git directory of a path.

  Options:

    -V, --version   output the version number
    -p, --path <p>  The path to check
    -h, --help      output usage information
```

