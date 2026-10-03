import { handleRequest } from "./relay.js";

export default {
  fetch(request, env, context) {
    return handleRequest(request, env, context);
  },
};
