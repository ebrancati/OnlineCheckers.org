package org.onlinecheckers.botlambda.resource;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.onlinecheckers.botlambda.dto.BotMoveRequestDto;
import org.onlinecheckers.botlambda.dto.BotMoveResponseDto;
import org.onlinecheckers.botlambda.service.BotService;
import org.jboss.logging.Logger;

@Path("/bot")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class BotLambdaResource {

    private static final Logger LOG = Logger.getLogger(BotLambdaResource.class);

    @Inject
    BotService botService;

    @POST
    @Path("/move")
    public Response calculateMove(BotMoveRequestDto request) {
        LOG.debugf("Received bot move request: color=%s, difficulty=%d", 
                   request.getPlayerColor(), request.getDifficulty());
        
        try {
            // Validate input
            if (request.getBoard() == null || request.getBoard().length != 8) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Invalid board state\"}")
                    .build();
            }
            
            if (request.getPlayerColor() == null || 
                (!request.getPlayerColor().equalsIgnoreCase("white") && 
                 !request.getPlayerColor().equalsIgnoreCase("black"))) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Invalid player color\"}")
                    .build();
            }
            
            if (request.getDifficulty() < 1 || request.getDifficulty() > 3) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity("{\"error\":\"Invalid difficulty level\"}")
                    .build();
            }

            BotMoveResponseDto response = botService.calculateBestMove(request);
            
            if (response.getFrom() == null || response.getTo() == null) {
                LOG.warn("No valid moves found for bot");
                return Response.status(Response.Status.NOT_FOUND)
                    .entity("{\"error\":\"No valid moves available\"}")
                    .build();
            }
            
            LOG.debugf("Bot move calculated: from=%s to=%s path=%s", 
                       response.getFrom(), response.getTo(), response.getPath());
            
            return Response.ok(response).build();
            
        } catch (Exception e) {
            LOG.errorf(e, "Error calculating bot move");
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity("{\"error\":\"Internal server error: " + e.getMessage() + "\"}")
                .build();
        }
    }

    @GET
    @Path("/health")
    public Response health() {
        return Response.ok("{\"status\":\"UP\",\"service\":\"bot-lambda\"}").build();
    }
}