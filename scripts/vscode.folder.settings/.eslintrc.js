module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "globals": {
        "Howl": false,
        "editor": false,
        "assert": false,
        "selectText": false,
        "sp": false,
        "__EDITOR_editableProps": false,
        "__getNodeExtendData": false,
        "ReactDOM": false,
        "React": false,
        "R": false,
        "PIXI": false,
        "$": false
    },
    "rules": {
        "no-console": 0,
        "no-unreachable": 1,
        "no-useless-escape":0,
        "indent": [
            "error",
            "tab"
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "semi": [
            "error",
            "always"
        ]
    }
};