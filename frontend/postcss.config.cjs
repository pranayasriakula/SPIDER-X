const prefixer = require('postcss-prefix-selector');

module.exports = {
	plugins: [
		prefixer({
			prefix: '.government-app',
			includeFiles: [/government\.css$/],
			transform(prefix, selector, prefixedSelector) {
				if (selector === ':root' || selector === 'html' || selector === 'body') {
					return prefix;
				}

				if (selector.startsWith('body ')) {
					return `${prefix} ${selector.slice(5)}`;
				}

				return prefixedSelector;
			},
		}),
	],
};
