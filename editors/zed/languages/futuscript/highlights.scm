(comment) @comment

(block_name) @keyword
(block_start ["(<" ">" ")"] @punctuation.special)
(block_end ["(</" ">" ")"] @punctuation.special)

(instruction_name) @keyword.control
(instruction ["(<" "(</" "</" ">" ")"] @punctuation.special)

(gcode) @keyword.directive

((tag_name) @tag
  (#match? @tag "^[a-z]"))
((tag_name) @type
  (#match? @type "^[A-Z]"))
(start_tag ["<" ">" "/>"] @punctuation.bracket)
(end_tag ["</" ">"] @punctuation.bracket)

((attribute_name) @attribute
  (#not-match? @attribute "^bind:"))
((attribute_name) @keyword
  (#match? @keyword "^bind:"))
(attribute "=" @punctuation.delimiter)
(quoted_attribute_value) @string
(attribute_value) @string

(expression ["{" "}"] @punctuation.special)
