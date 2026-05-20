package validation

import "regexp"

// ColorHexPattern matches a 7-character hex color code (e.g. "#194FBC").
var ColorHexPattern = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

// FallbackColor is used when a master record's color is invalid, missing, or orphan.
const FallbackColor = "#E5E7EB"

// IsValidHex returns true if s is a valid 7-character hex color code.
func IsValidHex(s string) bool {
	return ColorHexPattern.MatchString(s)
}
