.PHONY: sync-blog build serve

# Sync ~/Documents/Obsidian/sync-blog/ -> docs/ and refresh sync-nav in mkdocs.yml.
# Override: make sync-blog BLOG_SRC=/path/to/sync-blog
BLOG_SRC ?= $(HOME)/Documents/Obsidian/sync-blog

sync-blog:
	python3 scripts/sync-blog.py --src "$(BLOG_SRC)" --repo .

build:
	mkdocs build --strict

serve:
	mkdocs serve
