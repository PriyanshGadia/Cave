import { onRequestPost as __api_vault_admin_revoke_ts_onRequestPost } from "G:\\Programming\\Cave\\functions\\api\\vault\\admin\\revoke.ts"
import { onRequestPost as __api_vault_biometric_consent_ts_onRequestPost } from "G:\\Programming\\Cave\\functions\\api\\vault\\biometric\\consent.ts"
import { onRequestPost as __api_vault_biometric_enroll_ts_onRequestPost } from "G:\\Programming\\Cave\\functions\\api\\vault\\biometric\\enroll.ts"
import { onRequestPost as __api_vault_device_bind_ts_onRequestPost } from "G:\\Programming\\Cave\\functions\\api\\vault\\device\\bind.ts"
import { onRequestPost as __api_vault_identity_check_conflict_ts_onRequestPost } from "G:\\Programming\\Cave\\functions\\api\\vault\\identity\\check-conflict.ts"
import { onRequestPost as __api_vault_identity_conflict_ts_onRequestPost } from "G:\\Programming\\Cave\\functions\\api\\vault\\identity\\conflict.ts"
import { onRequestGet as __api_vault_identity_directory_ts_onRequestGet } from "G:\\Programming\\Cave\\functions\\api\\vault\\identity\\directory.ts"
import { onRequestPost as __api_vault_identity_directory_ts_onRequestPost } from "G:\\Programming\\Cave\\functions\\api\\vault\\identity\\directory.ts"
import { onRequestPost as __api_vault_liveness_challenge_ts_onRequestPost } from "G:\\Programming\\Cave\\functions\\api\\vault\\liveness\\challenge.ts"
import { onRequestPost as __api_vault_liveness_verify_ts_onRequestPost } from "G:\\Programming\\Cave\\functions\\api\\vault\\liveness\\verify.ts"
import { onRequestPost as __api_vault_photos_picker_complete_ts_onRequestPost } from "G:\\Programming\\Cave\\functions\\api\\vault\\photos\\picker-complete.ts"
import { onRequestGet as __api_vault_photos_picker_poll_ts_onRequestGet } from "G:\\Programming\\Cave\\functions\\api\\vault\\photos\\picker-poll.ts"
import { onRequestPost as __api_vault_photos_picker_session_ts_onRequestPost } from "G:\\Programming\\Cave\\functions\\api\\vault\\photos\\picker-session.ts"
import { onRequestPost as __api_vault_scan_complete_ts_onRequestPost } from "G:\\Programming\\Cave\\functions\\api\\vault\\scan\\complete.ts"
import { onRequestDelete as __api_vault_user_delete_ts_onRequestDelete } from "G:\\Programming\\Cave\\functions\\api\\vault\\user\\delete.ts"
import { onRequestPost as __api_vault_visit_create_ts_onRequestPost } from "G:\\Programming\\Cave\\functions\\api\\vault\\visit\\create.ts"
import { onRequestPost as __api_vault_webauthn_auth_challenge_ts_onRequestPost } from "G:\\Programming\\Cave\\functions\\api\\vault\\webauthn\\auth-challenge.ts"
import { onRequestPost as __api_vault_webauthn_auth_complete_ts_onRequestPost } from "G:\\Programming\\Cave\\functions\\api\\vault\\webauthn\\auth-complete.ts"
import { onRequestPost as __api_vault_webauthn_register_challenge_ts_onRequestPost } from "G:\\Programming\\Cave\\functions\\api\\vault\\webauthn\\register-challenge.ts"
import { onRequestPost as __api_vault_webauthn_register_complete_ts_onRequestPost } from "G:\\Programming\\Cave\\functions\\api\\vault\\webauthn\\register-complete.ts"
import { onRequestPatch as __api_state__namespace___elementId__ts_onRequestPatch } from "G:\\Programming\\Cave\\functions\\api\\state\\[namespace]\\[elementId].ts"
import { onRequestDelete as __api_admin_portfolio_ts_onRequestDelete } from "G:\\Programming\\Cave\\functions\\api\\admin\\portfolio.ts"
import { onRequestGet as __api_admin_portfolio_ts_onRequestGet } from "G:\\Programming\\Cave\\functions\\api\\admin\\portfolio.ts"
import { onRequestPatch as __api_admin_portfolio_ts_onRequestPatch } from "G:\\Programming\\Cave\\functions\\api\\admin\\portfolio.ts"
import { onRequestPost as __api_admin_portfolio_ts_onRequestPost } from "G:\\Programming\\Cave\\functions\\api\\admin\\portfolio.ts"
import { onRequestGet as __api_calendar_freebusy_ts_onRequestGet } from "G:\\Programming\\Cave\\functions\\api\\calendar\\freebusy.ts"
import { onRequestPost as __api_calendar_request_ts_onRequestPost } from "G:\\Programming\\Cave\\functions\\api\\calendar\\request.ts"
import { onRequestGet as __api_geo_earthquakes_ts_onRequestGet } from "G:\\Programming\\Cave\\functions\\api\\geo\\earthquakes.ts"
import { onRequestGet as __api_geo_flights_ts_onRequestGet } from "G:\\Programming\\Cave\\functions\\api\\geo\\flights.ts"
import { onRequestGet as __api_geo_locate_ts_onRequestGet } from "G:\\Programming\\Cave\\functions\\api\\geo\\locate.ts"
import { onRequestGet as __api_geo_news_ts_onRequestGet } from "G:\\Programming\\Cave\\functions\\api\\geo\\news.ts"
import { onRequestGet as __api_geo_satellites_ts_onRequestGet } from "G:\\Programming\\Cave\\functions\\api\\geo\\satellites.ts"
import { onRequestDelete as __api_vault_session_ts_onRequestDelete } from "G:\\Programming\\Cave\\functions\\api\\vault\\session.ts"
import { onRequestGet as __api_vault_session_ts_onRequestGet } from "G:\\Programming\\Cave\\functions\\api\\vault\\session.ts"
import { onRequestDelete as __api_notes__id__ts_onRequestDelete } from "G:\\Programming\\Cave\\functions\\api\\notes\\[id].ts"
import { onRequestGet as __api_notes__id__ts_onRequestGet } from "G:\\Programming\\Cave\\functions\\api\\notes\\[id].ts"
import { onRequestPut as __api_notes__id__ts_onRequestPut } from "G:\\Programming\\Cave\\functions\\api\\notes\\[id].ts"
import { onRequestGet as __api_state__namespace__ts_onRequestGet } from "G:\\Programming\\Cave\\functions\\api\\state\\[namespace].ts"
import { onRequestGet as __api_notes_index_ts_onRequestGet } from "G:\\Programming\\Cave\\functions\\api\\notes\\index.ts"
import { onRequestPost as __api_notes_index_ts_onRequestPost } from "G:\\Programming\\Cave\\functions\\api\\notes\\index.ts"
import { onRequestGet as __api_portfolio_ts_onRequestGet } from "G:\\Programming\\Cave\\functions\\api\\portfolio.ts"
import { onRequestGet as __api_projects_ts_onRequestGet } from "G:\\Programming\\Cave\\functions\\api\\projects.ts"

export const routes = [
    {
      routePath: "/api/vault/admin/revoke",
      mountPath: "/api/vault/admin",
      method: "POST",
      middlewares: [],
      modules: [__api_vault_admin_revoke_ts_onRequestPost],
    },
  {
      routePath: "/api/vault/biometric/consent",
      mountPath: "/api/vault/biometric",
      method: "POST",
      middlewares: [],
      modules: [__api_vault_biometric_consent_ts_onRequestPost],
    },
  {
      routePath: "/api/vault/biometric/enroll",
      mountPath: "/api/vault/biometric",
      method: "POST",
      middlewares: [],
      modules: [__api_vault_biometric_enroll_ts_onRequestPost],
    },
  {
      routePath: "/api/vault/device/bind",
      mountPath: "/api/vault/device",
      method: "POST",
      middlewares: [],
      modules: [__api_vault_device_bind_ts_onRequestPost],
    },
  {
      routePath: "/api/vault/identity/check-conflict",
      mountPath: "/api/vault/identity",
      method: "POST",
      middlewares: [],
      modules: [__api_vault_identity_check_conflict_ts_onRequestPost],
    },
  {
      routePath: "/api/vault/identity/conflict",
      mountPath: "/api/vault/identity",
      method: "POST",
      middlewares: [],
      modules: [__api_vault_identity_conflict_ts_onRequestPost],
    },
  {
      routePath: "/api/vault/identity/directory",
      mountPath: "/api/vault/identity",
      method: "GET",
      middlewares: [],
      modules: [__api_vault_identity_directory_ts_onRequestGet],
    },
  {
      routePath: "/api/vault/identity/directory",
      mountPath: "/api/vault/identity",
      method: "POST",
      middlewares: [],
      modules: [__api_vault_identity_directory_ts_onRequestPost],
    },
  {
      routePath: "/api/vault/liveness/challenge",
      mountPath: "/api/vault/liveness",
      method: "POST",
      middlewares: [],
      modules: [__api_vault_liveness_challenge_ts_onRequestPost],
    },
  {
      routePath: "/api/vault/liveness/verify",
      mountPath: "/api/vault/liveness",
      method: "POST",
      middlewares: [],
      modules: [__api_vault_liveness_verify_ts_onRequestPost],
    },
  {
      routePath: "/api/vault/photos/picker-complete",
      mountPath: "/api/vault/photos",
      method: "POST",
      middlewares: [],
      modules: [__api_vault_photos_picker_complete_ts_onRequestPost],
    },
  {
      routePath: "/api/vault/photos/picker-poll",
      mountPath: "/api/vault/photos",
      method: "GET",
      middlewares: [],
      modules: [__api_vault_photos_picker_poll_ts_onRequestGet],
    },
  {
      routePath: "/api/vault/photos/picker-session",
      mountPath: "/api/vault/photos",
      method: "POST",
      middlewares: [],
      modules: [__api_vault_photos_picker_session_ts_onRequestPost],
    },
  {
      routePath: "/api/vault/scan/complete",
      mountPath: "/api/vault/scan",
      method: "POST",
      middlewares: [],
      modules: [__api_vault_scan_complete_ts_onRequestPost],
    },
  {
      routePath: "/api/vault/user/delete",
      mountPath: "/api/vault/user",
      method: "DELETE",
      middlewares: [],
      modules: [__api_vault_user_delete_ts_onRequestDelete],
    },
  {
      routePath: "/api/vault/visit/create",
      mountPath: "/api/vault/visit",
      method: "POST",
      middlewares: [],
      modules: [__api_vault_visit_create_ts_onRequestPost],
    },
  {
      routePath: "/api/vault/webauthn/auth-challenge",
      mountPath: "/api/vault/webauthn",
      method: "POST",
      middlewares: [],
      modules: [__api_vault_webauthn_auth_challenge_ts_onRequestPost],
    },
  {
      routePath: "/api/vault/webauthn/auth-complete",
      mountPath: "/api/vault/webauthn",
      method: "POST",
      middlewares: [],
      modules: [__api_vault_webauthn_auth_complete_ts_onRequestPost],
    },
  {
      routePath: "/api/vault/webauthn/register-challenge",
      mountPath: "/api/vault/webauthn",
      method: "POST",
      middlewares: [],
      modules: [__api_vault_webauthn_register_challenge_ts_onRequestPost],
    },
  {
      routePath: "/api/vault/webauthn/register-complete",
      mountPath: "/api/vault/webauthn",
      method: "POST",
      middlewares: [],
      modules: [__api_vault_webauthn_register_complete_ts_onRequestPost],
    },
  {
      routePath: "/api/state/:namespace/:elementId",
      mountPath: "/api/state/:namespace",
      method: "PATCH",
      middlewares: [],
      modules: [__api_state__namespace___elementId__ts_onRequestPatch],
    },
  {
      routePath: "/api/admin/portfolio",
      mountPath: "/api/admin",
      method: "DELETE",
      middlewares: [],
      modules: [__api_admin_portfolio_ts_onRequestDelete],
    },
  {
      routePath: "/api/admin/portfolio",
      mountPath: "/api/admin",
      method: "GET",
      middlewares: [],
      modules: [__api_admin_portfolio_ts_onRequestGet],
    },
  {
      routePath: "/api/admin/portfolio",
      mountPath: "/api/admin",
      method: "PATCH",
      middlewares: [],
      modules: [__api_admin_portfolio_ts_onRequestPatch],
    },
  {
      routePath: "/api/admin/portfolio",
      mountPath: "/api/admin",
      method: "POST",
      middlewares: [],
      modules: [__api_admin_portfolio_ts_onRequestPost],
    },
  {
      routePath: "/api/calendar/freebusy",
      mountPath: "/api/calendar",
      method: "GET",
      middlewares: [],
      modules: [__api_calendar_freebusy_ts_onRequestGet],
    },
  {
      routePath: "/api/calendar/request",
      mountPath: "/api/calendar",
      method: "POST",
      middlewares: [],
      modules: [__api_calendar_request_ts_onRequestPost],
    },
  {
      routePath: "/api/geo/earthquakes",
      mountPath: "/api/geo",
      method: "GET",
      middlewares: [],
      modules: [__api_geo_earthquakes_ts_onRequestGet],
    },
  {
      routePath: "/api/geo/flights",
      mountPath: "/api/geo",
      method: "GET",
      middlewares: [],
      modules: [__api_geo_flights_ts_onRequestGet],
    },
  {
      routePath: "/api/geo/locate",
      mountPath: "/api/geo",
      method: "GET",
      middlewares: [],
      modules: [__api_geo_locate_ts_onRequestGet],
    },
  {
      routePath: "/api/geo/news",
      mountPath: "/api/geo",
      method: "GET",
      middlewares: [],
      modules: [__api_geo_news_ts_onRequestGet],
    },
  {
      routePath: "/api/geo/satellites",
      mountPath: "/api/geo",
      method: "GET",
      middlewares: [],
      modules: [__api_geo_satellites_ts_onRequestGet],
    },
  {
      routePath: "/api/vault/session",
      mountPath: "/api/vault",
      method: "DELETE",
      middlewares: [],
      modules: [__api_vault_session_ts_onRequestDelete],
    },
  {
      routePath: "/api/vault/session",
      mountPath: "/api/vault",
      method: "GET",
      middlewares: [],
      modules: [__api_vault_session_ts_onRequestGet],
    },
  {
      routePath: "/api/notes/:id",
      mountPath: "/api/notes",
      method: "DELETE",
      middlewares: [],
      modules: [__api_notes__id__ts_onRequestDelete],
    },
  {
      routePath: "/api/notes/:id",
      mountPath: "/api/notes",
      method: "GET",
      middlewares: [],
      modules: [__api_notes__id__ts_onRequestGet],
    },
  {
      routePath: "/api/notes/:id",
      mountPath: "/api/notes",
      method: "PUT",
      middlewares: [],
      modules: [__api_notes__id__ts_onRequestPut],
    },
  {
      routePath: "/api/state/:namespace",
      mountPath: "/api/state",
      method: "GET",
      middlewares: [],
      modules: [__api_state__namespace__ts_onRequestGet],
    },
  {
      routePath: "/api/notes",
      mountPath: "/api/notes",
      method: "GET",
      middlewares: [],
      modules: [__api_notes_index_ts_onRequestGet],
    },
  {
      routePath: "/api/notes",
      mountPath: "/api/notes",
      method: "POST",
      middlewares: [],
      modules: [__api_notes_index_ts_onRequestPost],
    },
  {
      routePath: "/api/portfolio",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_portfolio_ts_onRequestGet],
    },
  {
      routePath: "/api/projects",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_projects_ts_onRequestGet],
    },
  ]