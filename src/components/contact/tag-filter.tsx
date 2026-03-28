"use client";

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface TagFilterProps {
  tags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}

export function TagFilter({ tags, selectedTagIds, onChange }: TagFilterProps) {
  function toggleTag(tagId: string) {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  }

  function clearAll() {
    onChange([]);
  }

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button
        onClick={clearAll}
        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          selectedTagIds.length === 0
            ? "bg-amber-600 text-white"
            : "bg-amber-100 text-amber-800 hover:bg-amber-200"
        }`}
      >
        All
      </button>
      {tags.map((tag) => {
        const isSelected = selectedTagIds.includes(tag.id);
        return (
          <button
            key={tag.id}
            onClick={() => toggleTag(tag.id)}
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isSelected
                ? "bg-amber-600 text-white"
                : "bg-amber-100 text-amber-800 hover:bg-amber-200"
            }`}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
