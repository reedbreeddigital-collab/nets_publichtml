package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"nets-logistics-backend/internal/database"
	"nets-logistics-backend/internal/models"
	"nets-logistics-backend/internal/response"
)

type BlogHandler struct{}

func NewBlogHandler() *BlogHandler {
	return &BlogHandler{}
}

func generateID(prefix string) string {
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	return prefix + "_" + hex.EncodeToString(b)
}

// ----------------------------------------------------------------------------
// POSTS
// ----------------------------------------------------------------------------

func (h *BlogHandler) GetPosts(w http.ResponseWriter, r *http.Request) {
	var posts []models.BlogPost
	if err := database.DB.Preload("Comments").Order("created_at desc").Find(&posts).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to fetch posts")
		return
	}

	// Fetch categories to resolve category names
	var categories []models.BlogCategory
	catMap := make(map[string]string)
	if err := database.DB.Find(&categories).Error; err == nil {
		for _, c := range categories {
			catMap[c.ID] = c.Name
		}
	}

	for i := range posts {
		if posts[i].CategoryID != nil {
			if name, ok := catMap[*posts[i].CategoryID]; ok {
				posts[i].Category = name
			}
		}

		var tagNames []string
		database.DB.Raw("SELECT t.name FROM blog_tags t JOIN blog_post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?", posts[i].ID).Scan(&tagNames)
		posts[i].Tags = strings.Join(tagNames, ", ")
	}

	response.JSON(w, http.StatusOK, posts)
}

func (h *BlogHandler) GetPostBySlug(w http.ResponseWriter, r *http.Request, slug string) {
	var post models.BlogPost
	if err := database.DB.Preload("Comments").Where("slug = ? OR id = ?", slug, slug).First(&post).Error; err != nil {
		response.Error(w, http.StatusNotFound, "Post not found")
		return
	}

	if post.CategoryID != nil {
		var cat models.BlogCategory
		if err := database.DB.Where("id = ?", *post.CategoryID).First(&cat).Error; err == nil {
			post.Category = cat.Name
		}
	}

	var tagNames []string
	database.DB.Raw("SELECT t.name FROM blog_tags t JOIN blog_post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?", post.ID).Scan(&tagNames)
	post.Tags = strings.Join(tagNames, ", ")

	response.JSON(w, http.StatusOK, post)
}

func (h *BlogHandler) CreatePost(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Title      string  `json:"title"`
		Slug       string  `json:"slug"`
		Excerpt    string  `json:"excerpt"`
		Content    string  `json:"content"`
		CoverImage *string `json:"cover_image"`
		AuthorID   string  `json:"author_id"`
		Author     string  `json:"author"`
		CategoryID *string `json:"category_id"`
		Status     string  `json:"status"`
		Tags       string  `json:"tags"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if input.Title == "" {
		response.Error(w, http.StatusBadRequest, "Title is required")
		return
	}

	if input.Slug == "" {
		cleaned := strings.ToLower(input.Title)
		cleaned = strings.ReplaceAll(cleaned, " ", "-")
		cleaned = strings.Map(func(r rune) rune {
			if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
				return r
			}
			return -1
		}, cleaned)
		input.Slug = cleaned + "-" + generateID("")[1:]
	}

	authorName := input.Author
	if authorName == "" {
		authorName = "NETS Team"
	}

	status := input.Status
	if status == "" {
		status = "PUBLISHED"
	}

	post := models.BlogPost{
		ID:         generateID("post"),
		Title:      input.Title,
		Slug:       input.Slug,
		Excerpt:    input.Excerpt,
		Content:    input.Content,
		CoverImage: input.CoverImage,
		AuthorID:   input.AuthorID,
		Author:     authorName,
		CategoryID: input.CategoryID,
		Status:     status,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if post.Status == "PUBLISHED" {
		now := time.Now()
		post.PublishedAt = &now
	}

	if err := database.DB.Create(&post).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to create post: "+err.Error())
		return
	}

	syncTags(post.ID, input.Tags)
	post.Tags = input.Tags

	response.JSON(w, http.StatusCreated, post)
}

func (h *BlogHandler) UpdatePost(w http.ResponseWriter, r *http.Request) {
	var input struct {
		ID         string  `json:"id"`
		Title      string  `json:"title"`
		Slug       string  `json:"slug"`
		Excerpt    string  `json:"excerpt"`
		Content    string  `json:"content"`
		CoverImage *string `json:"cover_image"`
		AuthorID   string  `json:"author_id"`
		Author     string  `json:"author"`
		CategoryID *string `json:"category_id"`
		Status     string  `json:"status"`
		Tags       string  `json:"tags"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if input.ID == "" {
		response.Error(w, http.StatusBadRequest, "Post ID is required")
		return
	}

	var post models.BlogPost
	if err := database.DB.First(&post, "id = ?", input.ID).Error; err != nil {
		response.Error(w, http.StatusNotFound, "Post not found")
		return
	}

	if input.Title != "" {
		post.Title = input.Title
	}
	if input.Slug != "" {
		post.Slug = input.Slug
	}
	post.Excerpt = input.Excerpt
	post.Content = input.Content
	post.CoverImage = input.CoverImage
	if input.Author != "" {
		post.Author = input.Author
	}
	if input.AuthorID != "" {
		post.AuthorID = input.AuthorID
	}
	post.CategoryID = input.CategoryID
	if input.Status != "" {
		if post.Status != "PUBLISHED" && input.Status == "PUBLISHED" && post.PublishedAt == nil {
			now := time.Now()
			post.PublishedAt = &now
		}
		post.Status = input.Status
	}
	post.UpdatedAt = time.Now()

	if err := database.DB.Save(&post).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to update post")
		return
	}

	syncTags(post.ID, input.Tags)
	post.Tags = input.Tags

	response.JSON(w, http.StatusOK, post)
}

func (h *BlogHandler) DeletePost(w http.ResponseWriter, r *http.Request, id string) {
	if id == "" {
		response.Error(w, http.StatusBadRequest, "ID is required")
		return
	}
	database.DB.Exec("DELETE FROM blog_post_tags WHERE post_id = ?", id)
	database.DB.Exec("DELETE FROM blog_comments WHERE post_id = ?", id)
	if err := database.DB.Where("id = ?", id).Delete(&models.BlogPost{}).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to delete post")
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Post deleted successfully"})
}

// ----------------------------------------------------------------------------
// CATEGORIES
// ----------------------------------------------------------------------------

func (h *BlogHandler) GetCategories(w http.ResponseWriter, r *http.Request) {
	var categories []models.BlogCategory
	if err := database.DB.Order("name asc").Find(&categories).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to fetch categories")
		return
	}
	response.JSON(w, http.StatusOK, categories)
}

func (h *BlogHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name string `json:"name"`
		Slug string `json:"slug"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if input.Name == "" {
		response.Error(w, http.StatusBadRequest, "Category name is required")
		return
	}

	if input.Slug == "" {
		input.Slug = strings.ToLower(strings.ReplaceAll(input.Name, " ", "-"))
	}

	category := models.BlogCategory{
		ID:        generateID("cat"),
		Name:      input.Name,
		Slug:      input.Slug,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := database.DB.Create(&category).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to create category (slug may already exist)")
		return
	}

	response.JSON(w, http.StatusCreated, category)
}

func (h *BlogHandler) DeleteCategory(w http.ResponseWriter, r *http.Request, id string) {
	if id == "" {
		response.Error(w, http.StatusBadRequest, "ID is required")
		return
	}
	if err := database.DB.Where("id = ?", id).Delete(&models.BlogCategory{}).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to delete category")
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Category deleted successfully"})
}

// ----------------------------------------------------------------------------
// TAGS
// ----------------------------------------------------------------------------

func (h *BlogHandler) GetTags(w http.ResponseWriter, r *http.Request) {
	var tags []models.BlogTag
	if err := database.DB.Order("name asc").Find(&tags).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to fetch tags")
		return
	}
	response.JSON(w, http.StatusOK, tags)
}

func (h *BlogHandler) CreateTag(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name string `json:"name"`
		Slug string `json:"slug"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if input.Name == "" {
		response.Error(w, http.StatusBadRequest, "Tag name is required")
		return
	}

	if input.Slug == "" {
		input.Slug = strings.ToLower(strings.ReplaceAll(input.Name, " ", "-"))
	}

	tag := models.BlogTag{
		ID:        generateID("tag"),
		Name:      input.Name,
		Slug:      input.Slug,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := database.DB.Create(&tag).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to create tag (slug may already exist)")
		return
	}

	response.JSON(w, http.StatusCreated, tag)
}

func (h *BlogHandler) DeleteTag(w http.ResponseWriter, r *http.Request, id string) {
	if id == "" {
		response.Error(w, http.StatusBadRequest, "ID is required")
		return
	}
	database.DB.Exec("DELETE FROM blog_post_tags WHERE tag_id = ?", id)
	if err := database.DB.Where("id = ?", id).Delete(&models.BlogTag{}).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to delete tag")
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Tag deleted successfully"})
}

// ----------------------------------------------------------------------------
// COMMENTS
// ----------------------------------------------------------------------------

func (h *BlogHandler) GetComments(w http.ResponseWriter, r *http.Request) {
	var comments []models.BlogComment
	if err := database.DB.Order("created_at desc").Find(&comments).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to fetch comments")
		return
	}
	response.JSON(w, http.StatusOK, comments)
}

func (h *BlogHandler) CreateComment(w http.ResponseWriter, r *http.Request) {
	var input struct {
		PostID   string  `json:"post_id"`
		Content  string  `json:"content"`
		Name     string  `json:"name"`
		Email    string  `json:"email"`
		ParentID *string `json:"parent_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if input.PostID == "" || strings.TrimSpace(input.Content) == "" || strings.TrimSpace(input.Name) == "" {
		response.Error(w, http.StatusBadRequest, "Post ID, Name, and Content are required")
		return
	}

	comment := models.BlogComment{
		ID:        generateID("cmt"),
		PostID:    input.PostID,
		UserName:  input.Name,
		UserEmail: input.Email,
		Content:   input.Content,
		Status:    "APPROVED",
		ParentID:  input.ParentID,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := database.DB.Create(&comment).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to save comment")
		return
	}

	response.JSON(w, http.StatusCreated, comment)
}

func (h *BlogHandler) UpdateCommentStatus(w http.ResponseWriter, r *http.Request) {
	var input struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if input.ID == "" || input.Status == "" {
		response.Error(w, http.StatusBadRequest, "ID and Status are required")
		return
	}

	if err := database.DB.Model(&models.BlogComment{}).Where("id = ?", input.ID).Update("status", input.Status).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to update comment status")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Comment status updated"})
}

func (h *BlogHandler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		response.Error(w, http.StatusBadRequest, "ID is required")
		return
	}

	if err := database.DB.Where("id = ? OR parent_id = ?", id, id).Delete(&models.BlogComment{}).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to delete comment")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Comment deleted"})
}

// ----------------------------------------------------------------------------
// SUBSCRIBERS
// ----------------------------------------------------------------------------

func (h *BlogHandler) GetSubscribers(w http.ResponseWriter, r *http.Request) {
	var subs []models.NewsletterSubscriber
	if err := database.DB.Order("created_at desc").Find(&subs).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to fetch subscribers")
		return
	}
	response.JSON(w, http.StatusOK, subs)
}

func (h *BlogHandler) SubscribeNewsletter(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email string `json:"email"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	email := strings.TrimSpace(strings.ToLower(input.Email))
	if email == "" || !strings.Contains(email, "@") {
		response.Error(w, http.StatusBadRequest, "Valid email is required")
		return
	}

	var existing models.NewsletterSubscriber
	if err := database.DB.Where("email = ?", email).First(&existing).Error; err == nil {
		response.JSON(w, http.StatusOK, map[string]string{"message": "Already subscribed"})
		return
	}

	sub := models.NewsletterSubscriber{
		ID:        generateID("sub"),
		Email:     email,
		Status:    "ACTIVE",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := database.DB.Create(&sub).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to subscribe")
		return
	}

	response.JSON(w, http.StatusCreated, sub)
}

func (h *BlogHandler) DeleteSubscriber(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		response.Error(w, http.StatusBadRequest, "ID is required")
		return
	}

	if err := database.DB.Where("id = ?", id).Delete(&models.NewsletterSubscriber{}).Error; err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to delete subscriber")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Subscriber deleted"})
}

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

func syncTags(postID string, tagsStr string) {
	database.DB.Exec("DELETE FROM blog_post_tags WHERE post_id = ?", postID)
	if tagsStr == "" {
		return
	}

	tags := strings.Split(tagsStr, ",")
	for _, t := range tags {
		t = strings.TrimSpace(t)
		if t == "" {
			continue
		}
		slug := strings.ToLower(strings.ReplaceAll(t, " ", "-"))
		var tag models.BlogTag
		if err := database.DB.Where("slug = ?", slug).First(&tag).Error; err != nil {
			tag = models.BlogTag{
				ID:        generateID("tag"),
				Name:      t,
				Slug:      slug,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}
			database.DB.Create(&tag)
		}
		database.DB.Exec("INSERT INTO blog_post_tags (post_id, tag_id) VALUES (?, ?)", postID, tag.ID)
	}
}
