"use strict";

/**
 * Converts user input into a fully qualified URL.
 * If the input is not a valid URL, it becomes a search query.
 * @param {string} input - Raw user input
 * @param {string} template - Search engine URL template with %s placeholder
 * @returns {string} Fully qualified URL
 */
function search(input, template) {
	try {
		return new URL(input).toString();
	} catch (err) {}

	try {
		const url = new URL(`http://${input}`);
		if (url.hostname.includes(".")) return url.toString();
	} catch (err) {}

	return template.replace("%s", encodeURIComponent(input));
}
