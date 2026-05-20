package utils

import "github.com/gin-gonic/gin"

func GetUserID(c *gin.Context) uint {
	return c.GetUint("user_id")
}
