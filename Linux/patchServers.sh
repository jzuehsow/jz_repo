

input="/Users/jzuehsow/Downloads/import.csv"

while IFS= read -r line
do
    echo "$line"
done < "$input"