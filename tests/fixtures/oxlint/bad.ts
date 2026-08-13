// Explain the check.
function check(value) {
  if (!value) {
    return false;
  } else {
    return true;
  }
}

function choose(value) {
  if (value === 1) return "one";
  if (value === 2) return "two";
  if (value === 3) return "three";
  return "other";
}

check(true);
choose(1);
