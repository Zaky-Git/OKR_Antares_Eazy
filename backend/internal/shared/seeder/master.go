package seeder

import (
	"strings"

	divisionModule "github.com/antares-eazy/okr-backend/internal/modules/division"
	segmentModule "github.com/antares-eazy/okr-backend/internal/modules/segment"
	strategyModule "github.com/antares-eazy/okr-backend/internal/modules/strategy"
	"gorm.io/gorm"
)

// Summary reports the number of records inserted per entity on a seeder run.
type Summary struct {
	Strategies int
	Segments   int
	Divisions  int
}

// SeedMasters seeds default Strategy/Segment/Division records.
// Idempotent: pre-existing records (matched by LOWER(TRIM(name)) on live rows) are NOT overwritten or deleted.
// Each entity group runs in its own transaction. Returns Summary of records actually inserted.
func SeedMasters(db *gorm.DB) (Summary, error) {
	summary := Summary{}

	if err := db.Transaction(func(tx *gorm.DB) error {
		count, err := seedStrategies(tx)
		if err != nil {
			return err
		}
		summary.Strategies = count
		return nil
	}); err != nil {
		return summary, err
	}

	if err := db.Transaction(func(tx *gorm.DB) error {
		count, err := seedSegments(tx)
		if err != nil {
			return err
		}
		summary.Segments = count
		return nil
	}); err != nil {
		return summary, err
	}

	if err := db.Transaction(func(tx *gorm.DB) error {
		count, err := seedDivisions(tx)
		if err != nil {
			return err
		}
		summary.Divisions = count
		return nil
	}); err != nil {
		return summary, err
	}

	return summary, nil
}

func nameMatchesCI(tx *gorm.DB, table, name string) (bool, error) {
	var count int64
	normalized := strings.ToLower(strings.TrimSpace(name))
	err := tx.Table(table).
		Where("LOWER(TRIM(name)) = ? AND deleted_at IS NULL", normalized).
		Count(&count).Error
	return count > 0, err
}

type strategySeed struct {
	name      string
	color     string
	sortOrder int
}

var defaultStrategies = []strategySeed{
	{name: "Defend to Scale", color: "#194FBC", sortOrder: 1},
	{name: "Extend", color: "#10B981", sortOrder: 2},
	{name: "Transform", color: "#F59E0B", sortOrder: 3},
}

func seedStrategies(tx *gorm.DB) (int, error) {
	inserted := 0
	for _, s := range defaultStrategies {
		exists, err := nameMatchesCI(tx, "strategies", s.name)
		if err != nil {
			return inserted, err
		}
		if exists {
			continue
		}
		row := &strategyModule.Strategy{
			Name:      s.name,
			Color:     s.color,
			SortOrder: s.sortOrder,
			IsActive:  true,
		}
		if err := tx.Create(row).Error; err != nil {
			return inserted, err
		}
		inserted++
	}
	return inserted, nil
}

type segmentSeed struct {
	name  string
	color string
}

var defaultSegments = []segmentSeed{
	{name: "SME", color: "#3B82F6"},
	{name: "Enterprise", color: "#8B5CF6"},
	{name: "Government", color: "#EF4444"},
	{name: "B2B ICT", color: "#14B8A6"},
}

func seedSegments(tx *gorm.DB) (int, error) {
	inserted := 0
	for _, s := range defaultSegments {
		exists, err := nameMatchesCI(tx, "segments", s.name)
		if err != nil {
			return inserted, err
		}
		if exists {
			continue
		}
		row := &segmentModule.Segment{
			Name:     s.name,
			Color:    s.color,
			IsActive: true,
		}
		if err := tx.Create(row).Error; err != nil {
			return inserted, err
		}
		inserted++
	}
	return inserted, nil
}

type divisionSeed struct {
	name  string
	code  string
	color string
}

var defaultDivisions = []divisionSeed{
	{name: "Product", code: "PROD", color: "#194FBC"},
	{name: "Developer", code: "DEV", color: "#10B981"},
	{name: "GTM", code: "GTM", color: "#F59E0B"},
	{name: "UX", code: "UX", color: "#EC4899"},
	{name: "Operational", code: "OPS", color: "#6B7280"},
	{name: "Data", code: "DATA", color: "#0EA5E9"},
}

func seedDivisions(tx *gorm.DB) (int, error) {
	inserted := 0
	for _, d := range defaultDivisions {
		exists, err := nameMatchesCI(tx, "divisions", d.name)
		if err != nil {
			return inserted, err
		}
		if exists {
			continue
		}
		row := &divisionModule.Division{
			Name:     d.name,
			Code:     d.code,
			Color:    d.color,
			IsActive: true,
		}
		if err := tx.Create(row).Error; err != nil {
			return inserted, err
		}
		inserted++
	}
	return inserted, nil
}
