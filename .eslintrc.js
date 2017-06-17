module.exports = {
    "extends": [
        "airbnb-base"
    ],
    "globals": {
        "window": true,
        "document": true
    },
    "rules": {
        // babel inserts `'use strict';` for us
        "strict": "off",

        "import/no-extraneous-dependencies": "off",
        "import/no-unresolved": "off",
        "import/prefer-default-export": "off",

        // this option sets a specific tab width for your code
        // https://github.com/eslint/eslint/blob/master/docs/rules/indent.md
        "indent": [2, 4, { "SwitchCase": 1, "VariableDeclarator": 1 }],

        // increase maximum length of line
        "max-len": [2, 150, { "ignoreUrls": true, "ignoreComments": false }],

        "no-param-reassign": "off",

        "object-shorthand": "off",

        "no-underscore-dangle": "off",

        // temporary disabled, there are too many files with mixed linebreaks
        // enable when fixed
        "linebreak-style": "off",

        "no-mixed-operators": "off",

        // vetted on by the team (29 Aug 2016)
        "operator-assignment": "off",

        // vetted on by the team (30 Aug 2016)
        "no-continue": "off"
   },
   // "plugins": ["./.eslintrc-es5.js"], 
    "environments": {
        "es5": {
			"parserOptions": {
				"ecmaVersion": 5,
			}
		},
	},   
}