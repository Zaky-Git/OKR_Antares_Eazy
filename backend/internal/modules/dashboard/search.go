package dashboard

import (
	"net/http"
	"strings"

	"github.com/antares-eazy/okr-backend/internal/shared/response"
	"github.com/gin-gonic/gin"
)

type SearchResult struct {
	Type         string  `json:"type"`
	ID           uint    `json:"id"`
	Title        string  `json:"title"`
	Description  string  `json:"description"`
	ParentID     *uint   `json:"parent_id"`
	ParentTitle  string  `json:"parent_title"`
	ObjectiveID  *uint   `json:"objective_id"`
	StrategyName *string `json:"strategy_name,omitempty"`
	SegmentName  *string `json:"segment_name,omitempty"`
	DivisionName *string `json:"division_name,omitempty"`
}

func (h *Handler) Search(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	if q == "" || len(q) < 2 {
		response.Success(c, http.StatusOK, "Success", []SearchResult{})
		return
	}

	results, err := h.service.Search(q)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Search failed", nil)
		return
	}

	response.Success(c, http.StatusOK, "Success", results)
}

func (s *Service) Search(query string) ([]SearchResult, error) {
	var results []SearchResult
	like := "%" + query + "%"

	var objectives []struct {
		ID           uint
		Title        string
		StrategyName *string
		SegmentName  *string
		DivisionName *string
	}
	s.db.Table("objectives o").
		Select(`o.id, o.title, st.name AS strategy_name, sg.name AS segment_name, dv.name AS division_name`).
		Joins("LEFT JOIN strategies st ON st.id = o.strategy_id AND st.deleted_at IS NULL").
		Joins("LEFT JOIN segments sg ON sg.id = o.segment_id AND sg.deleted_at IS NULL").
		Joins("LEFT JOIN divisions dv ON dv.id = o.division_id AND dv.deleted_at IS NULL").
		Where("o.title LIKE ? AND o.deleted_at IS NULL", like).
		Limit(5).
		Find(&objectives)

	for _, o := range objectives {
		oid := o.ID
		results = append(results, SearchResult{
			Type:         "objective",
			ID:           o.ID,
			Title:        o.Title,
			ObjectiveID:  &oid,
			StrategyName: o.StrategyName,
			SegmentName:  o.SegmentName,
			DivisionName: o.DivisionName,
		})
	}

	var keyResults []struct {
		ID          uint
		Title       string
		ObjectiveID uint
		ObjTitle    string
	}
	s.db.Table("key_results").
		Select("key_results.id, key_results.title, key_results.objective_id, objectives.title as obj_title").
		Joins("LEFT JOIN objectives ON objectives.id = key_results.objective_id").
		Where("key_results.title LIKE ? AND key_results.deleted_at IS NULL", like).
		Limit(5).
		Find(&keyResults)

	for _, kr := range keyResults {
		objID := kr.ObjectiveID
		results = append(results, SearchResult{
			Type:        "key_result",
			ID:          kr.ID,
			Title:       kr.Title,
			ParentID:    &kr.ObjectiveID,
			ParentTitle: kr.ObjTitle,
			ObjectiveID: &objID,
		})
	}

	var initiatives []struct {
		ID          uint
		Title       string
		KeyResultID uint
		KRTitle     string
		ObjectiveID uint
	}
	s.db.Table("initiatives").
		Select("initiatives.id, initiatives.title, initiatives.key_result_id, key_results.title as kr_title, key_results.objective_id").
		Joins("LEFT JOIN key_results ON key_results.id = initiatives.key_result_id").
		Where("initiatives.title LIKE ? AND initiatives.deleted_at IS NULL", like).
		Limit(5).
		Find(&initiatives)

	for _, i := range initiatives {
		objID := i.ObjectiveID
		results = append(results, SearchResult{
			Type:        "initiative",
			ID:          i.ID,
			Title:       i.Title,
			ParentID:    &i.KeyResultID,
			ParentTitle: i.KRTitle,
			ObjectiveID: &objID,
		})
	}

	var sprints []struct {
		ID   uint
		Name string
	}
	s.db.Table("sprints").
		Where("name LIKE ? AND deleted_at IS NULL", like).
		Select("id, name").
		Limit(5).
		Find(&sprints)

	for _, sp := range sprints {
		results = append(results, SearchResult{
			Type:  "sprint",
			ID:    sp.ID,
			Title: sp.Name,
		})
	}

	return results, nil
}
