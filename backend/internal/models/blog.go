package models

import "time"

type BlogCategory struct {
	ID        string    `json:"id" gorm:"primaryKey;type:varchar(64)"`
	Name      string    `json:"name" gorm:"type:varchar(255);not null"`
	Slug      string    `json:"slug" gorm:"uniqueIndex;type:varchar(255);not null"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type BlogTag struct {
	ID        string    `json:"id" gorm:"primaryKey;type:varchar(64)"`
	Name      string    `json:"name" gorm:"type:varchar(255);not null"`
	Slug      string    `json:"slug" gorm:"uniqueIndex;type:varchar(255);not null"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type BlogPost struct {
	ID          string        `json:"id" gorm:"primaryKey;type:varchar(64)"`
	Title       string        `json:"title" gorm:"type:varchar(255);not null"`
	Slug        string        `json:"slug" gorm:"uniqueIndex;type:varchar(255);not null"`
	Excerpt     string        `json:"excerpt" gorm:"type:text"`
	Content     string        `json:"content" gorm:"type:longtext"`
	CoverImage  *string       `json:"cover_image" gorm:"type:varchar(512)"`
	AuthorID    string        `json:"author_id" gorm:"type:varchar(64);default:'admin'"`
	Author      string        `json:"author" gorm:"type:varchar(255);default:'NETS Team'"`
	CategoryID  *string       `json:"category_id" gorm:"type:varchar(64)"`
	Category    string        `json:"category" gorm:"-"`
	Status      string        `json:"status" gorm:"type:varchar(64);default:'PUBLISHED'"` // DRAFT, PUBLISHED
	PublishedAt *time.Time    `json:"published_at"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
	Tags        string        `json:"tags" gorm:"-"`
	Comments    []BlogComment `json:"comments,omitempty" gorm:"foreignKey:PostID"`
}

type BlogPostTag struct {
	PostID string `json:"post_id" gorm:"primaryKey;type:varchar(64)"`
	TagID  string `json:"tag_id" gorm:"primaryKey;type:varchar(64)"`
}

type BlogComment struct {
	ID        string    `json:"id" gorm:"primaryKey;type:varchar(64)"`
	PostID    string    `json:"post_id" gorm:"index;type:varchar(64);not null"`
	UserName  string    `json:"user_name" gorm:"type:varchar(255);not null"`
	UserEmail string    `json:"user_email" gorm:"type:varchar(255)"`
	Content   string    `json:"content" gorm:"type:text;not null"`
	Status    string    `json:"status" gorm:"type:varchar(64);default:'APPROVED'"` // PENDING, APPROVED, SPAM
	ParentID  *string   `json:"parent_id,omitempty" gorm:"index;type:varchar(64)"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type NewsletterSubscriber struct {
	ID        string    `json:"id" gorm:"primaryKey;type:varchar(64)"`
	Email     string    `json:"email" gorm:"uniqueIndex;type:varchar(255);not null"`
	Status    string    `json:"status" gorm:"type:varchar(64);default:'ACTIVE'"` // ACTIVE, UNSUBSCRIBED
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
