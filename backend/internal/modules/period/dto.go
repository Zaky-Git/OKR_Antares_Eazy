package period

import "time"

type PeriodResponse struct {
	ID        uint      `json:"id"`
	Year      int       `json:"year"`
	Quarter   string    `json:"quarter"`
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
	IsCurrent bool      `json:"is_current"`
}

func ToPeriodResponse(p *Period) PeriodResponse {
	return PeriodResponse{
		ID:        p.ID,
		Year:      p.Year,
		Quarter:   p.Quarter,
		StartDate: p.StartDate,
		EndDate:   p.EndDate,
		IsCurrent: p.IsCurrent,
	}
}

func ToPeriodResponses(periods []Period) []PeriodResponse {
	responses := make([]PeriodResponse, len(periods))
	for i, p := range periods {
		responses[i] = ToPeriodResponse(&p)
	}
	return responses
}
