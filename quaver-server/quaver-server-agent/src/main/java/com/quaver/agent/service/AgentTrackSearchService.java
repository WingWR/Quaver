package com.quaver.agent.service;

import com.quaver.agent.dto.AgentTrackSearchRequest;
import com.quaver.agent.dto.AgentTrackSearchResponse;

public interface AgentTrackSearchService {

    AgentTrackSearchResponse search(AgentTrackSearchRequest request);
}
