package com.quaver.agent.dto;

import com.quaver.library.dto.LibraryMutationResponse;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendAgentMessageResponse {

    private AgentConversationDto conversation;

    private AgentMessageDto userMessage;

    private AgentMessageDto assistantMessage;

    private List<AgentMessageDto> messages;

    private LibraryMutationResponse libraryMutation;
}
