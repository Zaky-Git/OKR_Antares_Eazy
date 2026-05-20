package period

import (
	"time"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetAllPeriods() ([]PeriodResponse, error) {
	periods, err := s.repo.FindAll()
	if err != nil {
		return nil, err
	}
	return ToPeriodResponses(periods), nil
}

func (s *Service) GetCurrentPeriod() (*PeriodResponse, error) {
	now := time.Now().UTC()
	year := now.Year()
	quarter := getQuarter(now)

	period, err := s.repo.FindByYearAndQuarter(year, quarter)
	if err != nil {
		return nil, err
	}

	resp := ToPeriodResponse(period)
	return &resp, nil
}

func (s *Service) EnsureCurrentYear() ([]PeriodResponse, error) {
	year := time.Now().UTC().Year()
	return s.EnsureYear(year)
}

func (s *Service) EnsureYear(year int) ([]PeriodResponse, error) {
	existing, err := s.repo.FindByYear(year)
	if err != nil {
		return nil, err
	}

	if len(existing) == 4 {
		s.updateCurrentFlag(existing)
		return ToPeriodResponses(existing), nil
	}

	quarters := []struct {
		Quarter   string
		StartDate time.Time
		EndDate   time.Time
	}{
		{"Q1", time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC), time.Date(year, 3, 31, 0, 0, 0, 0, time.UTC)},
		{"Q2", time.Date(year, 4, 1, 0, 0, 0, 0, time.UTC), time.Date(year, 6, 30, 0, 0, 0, 0, time.UTC)},
		{"Q3", time.Date(year, 7, 1, 0, 0, 0, 0, time.UTC), time.Date(year, 9, 30, 0, 0, 0, 0, time.UTC)},
		{"Q4", time.Date(year, 10, 1, 0, 0, 0, 0, time.UTC), time.Date(year, 12, 31, 0, 0, 0, 0, time.UTC)},
	}

	for _, q := range quarters {
		_, err := s.repo.FindByYearAndQuarter(year, q.Quarter)
		if err != nil {
			period := &Period{
				Year:      year,
				Quarter:   q.Quarter,
				StartDate: q.StartDate,
				EndDate:   q.EndDate,
				IsCurrent: false,
			}
			if err := s.repo.Create(period); err != nil {
				return nil, err
			}
		}
	}

	periods, err := s.repo.FindByYear(year)
	if err != nil {
		return nil, err
	}

	s.updateCurrentFlag(periods)
	return ToPeriodResponses(periods), nil
}

func (s *Service) updateCurrentFlag(periods []Period) {
	now := time.Now().UTC()
	currentQuarter := getQuarter(now)
	currentYear := now.Year()

	s.repo.ClearAllCurrent()

	for _, p := range periods {
		if p.Year == currentYear && p.Quarter == currentQuarter {
			s.repo.UpdateIsCurrent(p.ID, true)
		}
	}
}

func getQuarter(t time.Time) string {
	month := t.Month()
	switch {
	case month >= 1 && month <= 3:
		return "Q1"
	case month >= 4 && month <= 6:
		return "Q2"
	case month >= 7 && month <= 9:
		return "Q3"
	default:
		return "Q4"
	}
}
