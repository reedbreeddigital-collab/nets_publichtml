package models

import "time"

type Lead struct {
	ID                     uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	LeadReference          string    `json:"leadReference" gorm:"uniqueIndex;type:varchar(64);not null"`
	CustomerName           string    `json:"customerName" gorm:"type:varchar(255)"`
	CustomerEmail          string    `json:"customerEmail" gorm:"type:varchar(255)"`
	CustomerPhone          string    `json:"customerPhone" gorm:"type:varchar(64)"`
	Company                string    `json:"company" gorm:"type:varchar(255)"`
	HeardAboutUs           string    `json:"heardAboutUs" gorm:"type:varchar(255)"`
	JourneyType            string    `json:"journeyType" gorm:"type:varchar(64)"`
	Origin                 string    `json:"origin" gorm:"type:varchar(255)"`
	Destination            string    `json:"destination" gorm:"type:varchar(255)"`
	EstimatedInvestmentMin float64   `json:"estimatedInvestmentMin" gorm:"default:0"`
	EstimatedInvestmentMax float64   `json:"estimatedInvestmentMax" gorm:"default:0"`
	Status                 string    `json:"status" gorm:"type:varchar(64);default:'pending'"`
	CrmStatus              string    `json:"crmStatus" gorm:"type:varchar(64);default:'New Lead'"`
	AssignedTo             string    `json:"assignedTo" gorm:"type:varchar(64)"`
	Notes                  string     `json:"notes" gorm:"type:text"`
	PayloadJSON            string     `json:"-" gorm:"type:longtext"`
	Payload                any        `json:"payload,omitempty" gorm:"-"`
	FirstContactedAt       *time.Time `json:"firstContactedAt,omitempty" gorm:"index"`
	FirstContactedBy       string     `json:"firstContactedBy,omitempty" gorm:"type:varchar(64)"`
	ResponseTimeSec        *int64     `json:"responseTimeSec,omitempty"`
	ClosedAt               *time.Time `json:"closedAt,omitempty" gorm:"index"`
	CloseTimeSec           *int64     `json:"closeTimeSec,omitempty"`
	CreatedAt              time.Time  `json:"createdAt"`
	UpdatedAt              time.Time  `json:"updatedAt"`
}

type Contact struct {
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	Name      string    `json:"name" gorm:"type:varchar(255);not null"`
	Email     string    `json:"email" gorm:"type:varchar(255);not null"`
	Phone     string    `json:"phone" gorm:"type:varchar(64)"`
	Subject   string    `json:"subject" gorm:"type:varchar(255)"`
	Message   string    `json:"message" gorm:"type:text;not null"`
	Status    string    `json:"status" gorm:"type:varchar(64);default:'unread'"`
	CreatedAt time.Time `json:"createdAt"`
}

type Vehicle struct {
	ID              string    `json:"id" gorm:"primaryKey;type:varchar(64)"`
	Name            string    `json:"name" gorm:"type:varchar(255);not null"`
	Slug            string    `json:"slug" gorm:"uniqueIndex;type:varchar(255);not null"`
	Category        string    `json:"category" gorm:"type:varchar(255)"`
	Capacity        int       `json:"capacity"`
	BestFor         string    `json:"bestFor" gorm:"type:text"`
	ImageURL        string    `json:"imageUrl" gorm:"type:varchar(255)"`
	Features        []string  `json:"features" gorm:"-"`
	FeaturesJSON    string    `json:"-" gorm:"type:text"`
	Available       bool      `json:"available" gorm:"default:true"`
	ComfortRating   string    `json:"comfortRating" gorm:"type:varchar(64)"`
	LuggageSpace    string    `json:"luggageSpace" gorm:"type:varchar(255)"`
	AirConditioning string    `json:"airConditioning" gorm:"type:varchar(255)"`
	CreatedAt       time.Time `json:"createdAt"`
}

type Booking struct {
	ID                string    `json:"id" gorm:"primaryKey;type:varchar(64)"`
	Reference         string    `json:"reference" gorm:"uniqueIndex;type:varchar(64);not null"`
	QuoteReference    string    `json:"quoteReference" gorm:"type:varchar(64)"`
	CustomerID        string    `json:"customerId" gorm:"type:varchar(64)"`
	CustomerName      string    `json:"customerName" gorm:"type:varchar(255)"`
	VehicleID         string    `json:"vehicleId" gorm:"type:varchar(64)"`
	VehicleName       string    `json:"vehicleName" gorm:"type:varchar(255)"`
	DriverID          string    `json:"driverId" gorm:"type:varchar(64)"`
	DriverName        string    `json:"driverName" gorm:"type:varchar(255)"`
	Pickup            string    `json:"pickup" gorm:"type:varchar(255)"`
	Destination       string    `json:"destination" gorm:"type:varchar(255)"`
	DistanceKM        float64   `json:"distanceKm"`
	DurationMins      int       `json:"durationMins"`
	TripType          string    `json:"tripType" gorm:"type:varchar(64)"`
	PassengerCount    int       `json:"passengerCount"`
	TravelDate        time.Time `json:"travelDate"`
	TotalAmount       float64   `json:"totalAmount"`
	PaymentStatus     string    `json:"paymentStatus" gorm:"type:varchar(64);default:'pending'"`
	OperationalStatus string    `json:"operationalStatus" gorm:"type:varchar(64);default:'confirmed'"`
	Notes             string    `json:"notes" gorm:"type:text"`
	CreatedAt         time.Time `json:"createdAt"`
}

type Customer struct {
	ID            string    `json:"id" gorm:"primaryKey;type:varchar(64)"`
	FullName      string    `json:"fullName" gorm:"type:varchar(255);not null"`
	Email         string    `json:"email" gorm:"uniqueIndex;type:varchar(255);not null"`
	Phone         string    `json:"phone" gorm:"type:varchar(64)"`
	Company       string    `json:"company" gorm:"type:varchar(255)"`
	CustomerType  string    `json:"type" gorm:"type:varchar(64);default:'corporate'"`
	TotalBookings int       `json:"totalBookings" gorm:"default:0"`
	TotalSpend    float64   `json:"totalSpend" gorm:"default:0"`
	Notes         string    `json:"notes" gorm:"type:text"`
	CreatedAt     time.Time `json:"createdAt"`
}

type User struct {
	ID        string    `json:"id" gorm:"primaryKey;type:varchar(64)"`
	FullName  string    `json:"fullName" gorm:"type:varchar(255);not null"`
	Email     string    `json:"email" gorm:"uniqueIndex;type:varchar(255);not null"`
	Role      string    `json:"role" gorm:"type:varchar(64);default:'staff'"`
	Status    string    `json:"status" gorm:"type:varchar(64);default:'active'"`
	LastLogin time.Time `json:"lastLogin"`
	CreatedAt time.Time `json:"createdAt"`
}

type PricingConfig struct {
	ID         uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	ConfigJSON string    `json:"configJson" gorm:"type:json"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type SystemSetting struct {
	ID           uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	SettingsJSON string    `json:"settingsJson" gorm:"type:text"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type CloserStat struct {
	UserID             string  `json:"userId"`
	FullName           string  `json:"fullName"`
	Email              string  `json:"email"`
	Role               string  `json:"role"`
	TotalAssigned      int64   `json:"totalAssigned"`
	TotalWon           int64   `json:"totalWon"`
	WinRate            int     `json:"winRate"`
	AvgResponseTimeSec int64   `json:"avgResponseTimeSec"`
	AvgCloseTimeSec    int64   `json:"avgCloseTimeSec"`
	TotalRevenue       float64 `json:"totalRevenue"`
}
